import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

// Local-only fixtures. Credentials stay in memory and are never logged.
export function localClients() {
  const status = JSON.parse(
    execFileSync("node_modules/.bin/supabase", ["status", "-o", "json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }),
  );
  assert.match(status.API_URL, /^http:\/\/(127\.0\.0\.1|localhost):/);
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  return {
    admin: createClient(status.API_URL, status.SERVICE_ROLE_KEY, options),
    client: () => createClient(status.API_URL, status.ANON_KEY, options),
  };
}

export async function fixture() {
  const { admin, client } = localClients();
  const users = [],
    organizations = [];
  const cleanup = async (extraOrganizations = [], extraUsers = []) => {
    for (const organizationId of [...organizations, ...extraOrganizations]) {
      for (const table of [
        "cocktail_productions",
        "inventory_movements",
        "cocktails",
        "inventory_products",
        "ingredients",
      ]) {
        if (
          ["cocktails", "inventory_products", "ingredients"].includes(table)
        ) {
          const { data } = await admin
            .from(table)
            .select("image_path")
            .eq("organization_id", organizationId);
          const paths = (data ?? []).flatMap((item) =>
            item.image_path ? [item.image_path] : [],
          );
          if (paths.length) {
            const { error } = await admin.storage
              .from("catalog-images")
              .remove(paths);
            if (error) throw error;
          }
        }
        if (table === "cocktail_productions") {
          const { data } = await admin
            .from(table)
            .select("id")
            .eq("organization_id", organizationId);
          if (data?.length)
            await admin
              .from("cocktail_production_ingredients")
              .delete()
              .in(
                "production_id",
                data.map((p) => p.id),
              );
        }
        if (table === "inventory_products") {
          const { data } = await admin
            .from(table)
            .select("id")
            .eq("organization_id", organizationId);
          if (data?.length)
            await admin
              .from("inventory_balances")
              .delete()
              .in(
                "inventory_product_id",
                data.map((p) => p.id),
              );
        }
        const { error } = await admin
          .from(table)
          .delete()
          .eq("organization_id", organizationId);
        if (error)
          throw new Error(
            `Fixture cleanup failed (${table}): ${error.message}`,
          );
      }
      const { error } = await admin
        .from("organizations")
        .delete()
        .eq("id", organizationId);
      if (error) throw error;
    }
    for (const id of [...users, ...extraUsers]) {
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) throw error;
    }
  };
  const user = async () => {
    const email = `bar-test-${randomUUID()}@example.com`,
      password = `Test1-${randomUUID()}`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;
    users.push(data.user.id);
    const session = client();
    const signed = await session.auth.signInWithPassword({ email, password });
    if (signed.error) throw signed.error;
    return { id: data.user.id, email, password, api: session };
  };
  const owner = await user();
  const { data: org, error } = await owner.api.rpc("create_organization", {
    organization_name: `Test bar ${randomUUID()}`,
    first_location_name: "Test main",
    location_timezone: "America/Chicago",
  });
  if (error) {
    await cleanup();
    throw error;
  }
  organizations.push(org);
  const { data: location } = await owner.api
    .from("locations")
    .select("id")
    .eq("organization_id", org)
    .single();
  return {
    admin,
    owner,
    org,
    location: location.id,
    user,
    cleanup,
    organizations,
  };
}

export async function runIntegration() {
  const f = await fixture();
  try {
    const {
      owner: { api },
      org,
      location,
    } = f;
    const seed = () =>
      api.rpc("seed_starter_bar", {
        target_organization_id: org,
        target_location_id: location,
      });
    assert.equal((await seed()).error, null);
    const { data: cocktails } = await api
      .from("cocktails")
      .select("id,name")
      .eq("organization_id", org);
    assert.equal(cocktails.length, 6);
    const mule = cocktails.find((c) => c.name === "Moscow Mule");
    const { data: lines } = await api
      .from("cocktail_ingredients")
      .select("*")
      .eq("cocktail_id", mule.id);
    const { data: products } = await api
      .from("inventory_products")
      .select("*")
      .eq("organization_id", org);
    const selections = Object.fromEntries(
      lines.map((line) => [
        line.id,
        products.find((p) => p.ingredient_id === line.ingredient_id).id,
      ]),
    );
    const first = lines[0],
      productId = selections[first.id];
    const balance = async () => {
      const { data } = await api
        .from("inventory_balances")
        .select("quantity")
        .eq("location_id", location)
        .eq("inventory_product_id", productId)
        .single();
      return Number(data.quantity);
    };

    const before = await balance();
    const direct = await api
      .from("inventory_movements")
      .insert({
        organization_id: org,
        location_id: location,
        inventory_product_id: productId,
        movement_type: "correction",
        quantity_delta: -999999,
      });
    assert.ok(direct.error, "Direct stock insert must be denied");
    const overdraw = await api.rpc("record_stock_movement", {
      target_organization_id: org,
      target_location_id: location,
      target_inventory_product_id: productId,
      stock_movement_type: "spill",
      stock_quantity_delta: -999999,
    });
    assert.ok(overdraw.error);
    assert.equal(await balance(), before);
    const invalidNumeric = await api.rpc("record_stock_movement", {
      target_organization_id: org, target_location_id: location,
      target_inventory_product_id: productId, stock_movement_type: "purchase", stock_quantity_delta: "NaN",
    });
    assert.ok(invalidNumeric.error);
    assert.equal(await balance(), before);
    console.log("PASS: direct-write bypass and negative balances blocked");

    const args = {
      target_organization_id: org,
      target_location_id: location,
      target_cocktail_id: mule.id,
      production_quantity: 1,
      product_selections: selections,
      request_id: randomUUID(),
    };
    const pours = await Promise.all([
      api.rpc("make_cocktail", args),
      api.rpc("make_cocktail", args),
    ]);
    pours.forEach((p) => assert.equal(p.error, null));
    assert.equal(pours[0].data, pours[1].data);
    assert.equal(await balance(), before - Number(first.quantity_in_base_unit));
    console.log("PASS: concurrent retries deduct inventory exactly once");

    const used = await api
      .from("cocktail_ingredients")
      .delete()
      .eq("id", first.id);
    assert.equal(used.error, null);
    const history = await api
      .from("cocktail_production_ingredients")
      .select("*")
      .eq("production_id", pours[0].data)
      .eq("inventory_product_id", productId)
      .single();
    assert.equal(history.error, null);
    assert.equal(history.data.cocktail_ingredient_id, null);
    assert.ok(
      history.data.ingredient_name &&
        history.data.product_label &&
        history.data.base_unit,
    );
    console.log(
      "PASS: removing a used recipe line preserves production snapshots",
    );

    const customLine = lines[1];
    await api
      .from("cocktail_ingredients")
      .update({ quantity_in_base_unit: 37 })
      .eq("id", customLine.id);
    await api
      .from("location_products")
      .update({ reorder_point: 10, target_stock: 20 })
      .eq("location_id", location)
      .eq("inventory_product_id", productId);
    const preservedBalance = await balance();
    assert.equal((await seed()).error, null);
    assert.equal(await balance(), preservedBalance);
    const customized = await api
      .from("cocktail_ingredients")
      .select("quantity_in_base_unit")
      .eq("id", customLine.id)
      .single();
    assert.equal(Number(customized.data.quantity_in_base_unit), 37);
    const removed = await api
      .from("cocktail_ingredients")
      .select("id")
      .eq("id", first.id);
    assert.equal(removed.data.length, 0);
    const target = await api
      .from("location_products")
      .select("target_stock")
      .eq("location_id", location)
      .eq("inventory_product_id", productId)
      .single();
    assert.equal(Number(target.data.target_stock), 20);
    console.log(
      "PASS: repeated starter load preserves custom recipes, targets, and balances",
    );

    const otherRecipe = cocktails.find((c) => c.name === "Old Fashioned");
    const { data: otherLines } = await api
      .from("cocktail_ingredients")
      .select("*")
      .eq("cocktail_id", otherRecipe.id)
      .order("id");
    const otherSelections = Object.fromEntries(
      otherLines.map((l) => [
        l.id,
        products.find((p) => p.ingredient_id === l.ingredient_id).id,
      ]),
    );
    const missingProduct = otherSelections[otherLines.at(-1).id];
    const getBalances = async () => {
      const { data, error } = await api
        .from("inventory_balances")
        .select("inventory_product_id,quantity")
        .eq("location_id", location)
        .order("inventory_product_id");
      assert.equal(error, null);
      return data;
    };
    const beforeMissing = await getBalances();
    const missingStock = Number(
      beforeMissing.find((b) => b.inventory_product_id === missingProduct)
        .quantity,
    );
    assert.equal(
      (
        await api.rpc("record_stock_movement", {
          target_organization_id: org,
          target_location_id: location,
          target_inventory_product_id: missingProduct,
          stock_movement_type: "correction",
          stock_quantity_delta: -missingStock,
        })
      ).error,
      null,
    );
    const beforeFailedPour = await getBalances();
    const failedPour = await api.rpc("make_cocktail", {
      ...args,
      target_cocktail_id: otherRecipe.id,
      product_selections: otherSelections,
      request_id: randomUUID(),
    });
    assert.ok(failedPour.error);
    assert.deepEqual(await getBalances(), beforeFailedPour);
    const { count: productionCount } = await api
      .from("cocktail_productions")
      .select("id", { count: "exact", head: true })
      .eq("location_id", location);
    assert.equal(productionCount, 1);
    console.log(
      "PASS: a missing ingredient rolls back the entire multi-ingredient pour and history",
    );

    const member = await f.user();
    const { data: invite } = await api
      .from("organization_invitations")
      .insert({ organization_id: org, email: member.email, role: "bartender" })
      .select("code")
      .single();
    const outsider = await f.user();
    assert.ok(
      (
        await outsider.api.rpc("accept_invitation", {
          invitation_code: invite.code,
        })
      ).error,
    );
    assert.equal(
      (
        await member.api.rpc("accept_invitation", {
          invitation_code: invite.code,
        })
      ).error,
      null,
    );
    assert.ok(
      (
        await member.api.rpc("record_stock_movement", {
          target_organization_id: org,
          target_location_id: location,
          target_inventory_product_id: productId,
          stock_movement_type: "purchase",
          stock_quantity_delta: 1,
        })
      ).error,
    );
    assert.ok(
      (
        await api.rpc("manage_team_member", {
          target_organization_id: org,
          target_user_id: f.owner.id,
          new_role: "bartender",
        })
      ).error,
    );
    assert.ok(
      (
        await outsider.api.rpc("production_report", {
          target_location_id: location,
          from_date: "2026-01-01",
          through_date: "2026-12-31",
        })
      ).error,
    );
    const { data: outsiderOrg } = await outsider.api.rpc(
      "create_organization",
      {
        organization_name: `Test bar ${randomUUID()}`,
        first_location_name: "Other tenant",
      },
    );
    f.organizations.push(outsiderOrg);
    const { data: outsiderLocation } = await outsider.api
      .from("locations")
      .select("id")
      .eq("organization_id", outsiderOrg)
      .single();
    assert.ok(
      (
        await api.rpc("record_stock_movement", {
          target_organization_id: org,
          target_location_id: outsiderLocation.id,
          target_inventory_product_id: productId,
          stock_movement_type: "purchase",
          stock_quantity_delta: 1,
        })
      ).error,
    );
    console.log(
      "PASS: email-bound invitations, bartender permissions, last-owner protection, and report isolation",
    );

    for (const [at_time, hours] of [
      ["2026-03-08T12:00:00Z", 23],
      ["2026-11-01T12:00:00Z", 25],
    ]) {
      const day = await api.rpc("daily_production_totals", {
        target_location_id: location,
        at_time,
      });
      assert.equal(day.error, null);
      assert.equal(
        (Date.parse(day.data.day_end) - Date.parse(day.data.day_start)) /
          3600000,
        hours,
      );
    }
    const report = await api.rpc("production_report", {
      target_location_id: location,
      from_date: "2020-01-01",
      through_date: "2020-12-31",
    });
    assert.equal(report.error, null);
    assert.equal(report.data.drinks, 0);
    console.log(
      "PASS: timezone day boundaries handle 23-hour and 25-hour days",
    );

    // A fresh one-ingredient recipe exercises competing distinct orders.
    const { data: competing } = await api
      .from("cocktails")
      .insert({
        organization_id: org,
        name: "Concurrency test",
        instructions: "Test pour",
      })
      .select("id")
      .single();
    const { data: line } = await api
      .from("cocktail_ingredients")
      .insert({
        organization_id: org,
        cocktail_id: competing.id,
        ingredient_id: first.ingredient_id,
        quantity_in_base_unit: 10,
      })
      .select("id")
      .single();
    const current = await balance();
    const adjust = await api.rpc("record_stock_movement", {
      target_organization_id: org,
      target_location_id: location,
      target_inventory_product_id: productId,
      stock_movement_type: "correction",
      stock_quantity_delta: 10 - current,
    });
    assert.equal(adjust.error, null);
    const compete = () =>
      api.rpc("make_cocktail", {
        ...args,
        target_cocktail_id: competing.id,
        product_selections: { [line.id]: productId },
        request_id: randomUUID(),
      });
    const results = await Promise.all([compete(), compete()]);
    assert.equal(results.filter((r) => !r.error).length, 1);
    assert.equal(await balance(), 0);
    console.log("PASS: competing pours cannot oversell the last serving");
  } finally {
    await f.cleanup();
    console.log("Temporary test accounts and stock removed.");
  }
}

if (process.argv[1]?.endsWith("test-local.mjs")) await runIntegration();
