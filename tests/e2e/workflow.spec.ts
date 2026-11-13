import { test, expect } from "@playwright/test";
// The local fixture creates an isolated organization and removes it afterward.
import { fixture } from "../../scripts/test-local.mjs";

test("owner can load stock, edit targets, pour, preserve history, and switch locations", async ({
  page,
}) => {
  const f = await fixture();
  try {
    await page.goto("/login");
    await page.getByLabel("Email address", { exact: true }).fill(f.owner.email);
    await page.getByLabel("Password", { exact: true }).fill(f.owner.password);
    await page
      .locator("form")
      .getByRole("button", { name: "Sign in to Bar Manager", exact: true })
      .click();
    await expect(page).toHaveURL(/dashboard/);
    await page.getByRole("button", { name: "Load starter bar" }).click();
    await expect(page.getByText(/Starter bar loaded/)).toBeVisible();

    await page.goto("/inventory");
    const smirnoff = page
      .getByRole("row")
      .filter({ hasText: "Smirnoff No. 21 Vodka" });
    await smirnoff.getByText("Edit product & stock targets").click();
    await smirnoff.getByLabel("Reorder at", { exact: true }).fill("3000");
    await smirnoff.getByLabel("Target stock", { exact: true }).fill("4500");
    await smirnoff.getByRole("button", { name: "Save product" }).click();
    await expect(
      smirnoff.getByText("Product and location stock targets saved."),
    ).toBeVisible();
    await smirnoff.locator('input[type="file"]').setInputFiles({
      name: "test-stock.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=",
        "base64",
      ),
    });
    await expect(
      smirnoff.getByRole("button", { name: "Replace", exact: true }),
    ).toBeVisible();
    const { data: uploaded } = await f.owner.api
      .from("inventory_products")
      .select("image_path")
      .eq("organization_id", f.org)
      .eq("brand", "Smirnoff")
      .single();
    await smirnoff.locator('input[type="file"]').setInputFiles({
      name: "replacement-stock.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=",
        "base64",
      ),
    });
    if (!uploaded?.image_path)
      throw new Error("Uploaded product image was not saved.");
    const oldName = uploaded.image_path.split("/").at(-1);
    await expect
      .poll(async () => {
        const prefix = uploaded.image_path.split("/").slice(0, -1).join("/");
        const { data } = await f.admin.storage
          .from("catalog-images")
          .list(prefix);
        return data?.some((file: { name: string }) => file.name === oldName);
      })
      .toBe(false);

    await page.goto("/service");
    const mule = page.locator("article").filter({
      has: page.getByRole("heading", { name: "Moscow Mule", exact: true }),
    });
    await mule.locator("summary").click();
    const vodka = mule.getByRole("combobox", { name: /^Vodka/ });
    const make = mule.getByRole("button", {
      name: "Make 1 drink",
      exact: true,
    });
    await expect(vodka).toHaveValue("");
    await expect(
      mule.getByRole("combobox", { name: /^Lime Juice/ }),
    ).not.toHaveValue("");
    await expect(
      mule.getByRole("combobox", { name: /^Ginger Beer/ }),
    ).not.toHaveValue("");
    await expect(make).toBeDisabled();
    const smirnoffId = await vodka
      .getByRole("option", { name: /Smirnoff/ })
      .getAttribute("value");
    if (!smirnoffId) throw new Error("Smirnoff product option was not found.");
    await vodka.selectOption(smirnoffId);
    await expect(make).toBeEnabled();
    await mule
      .getByRole("button", { name: "Make 1 drink", exact: true })
      .click();
    await expect(mule.getByText(/1 drink made/)).toBeVisible();
    await expect(vodka).toHaveValue("");
    await expect(make).toBeDisabled();
    await expect(
      mule.getByRole("combobox", { name: /^Lime Juice/ }),
    ).not.toHaveValue("");
    await expect(
      mule.getByRole("combobox", { name: /^Ginger Beer/ }),
    ).not.toHaveValue("");
    await page.goto("/reports");
    await expect(page.getByText("1 × Moscow Mule")).toBeVisible();
    await page.getByText("1 × Moscow Mule").click();
    await expect(page.getByText(/Vodka: Smirnoff No. 21 Vodka/)).toBeVisible();

    await page.goto("/purchasing");
    const purchase = page
      .locator("article")
      .filter({ hasText: "Smirnoff No. 21 Vodka" });
    await purchase.getByLabel("Quantity received", { exact: true }).fill("750");
    await purchase
      .getByRole("button", { name: "Receive", exact: true })
      .click();
    await expect(purchase).toHaveCount(0);
    await page.goto("/inventory");
    await expect(smirnoff.getByText("3,700 ml", { exact: true })).toBeVisible();
    await smirnoff.getByText("Edit product & stock targets").click();
    page.once("dialog", (dialog) => dialog.accept());
    await smirnoff
      .getByRole("button", { name: "Archive", exact: true })
      .click();
    await expect(smirnoff).toHaveCount(0);
    const archived = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Archived catalog" }) });
    await archived
      .getByRole("button", { name: "Restore", exact: true })
      .click();
    await expect(smirnoff).toHaveCount(1);

    await page.goto("/cocktails");
    const recipe = page.locator("article").filter({
      has: page.getByRole("heading", { name: "Moscow Mule", exact: true }),
    });
    await recipe
      .getByRole("listitem")
      .filter({ hasText: "Vodka" })
      .getByRole("button", { name: "Remove recipe ingredient" })
      .click();
    await expect(
      recipe.getByRole("listitem").filter({ hasText: "Vodka" }),
    ).toHaveCount(0);
    await page.goto("/reports");
    await page.getByText("1 × Moscow Mule").click();
    await expect(page.getByText(/Vodka: Smirnoff No. 21 Vodka/)).toBeVisible();

    await page.goto("/settings");
    await page
      .getByLabel("Location name", { exact: true })
      .fill("Second test bar");
    await page
      .getByRole("button", { name: "Add location", exact: true })
      .click();
    await expect(
      page.getByText("Location created and selected."),
    ).toBeVisible();
    await page.goto("/service");
    await expect(page.getByText("0 of 6 available")).toBeVisible();
    await page
      .getByLabel("Current location", { exact: true })
      .selectOption(f.location);
    await page.getByRole("button", { name: "Switch", exact: true }).click();
    await expect(page.getByText("6 of 6 available")).toBeVisible();
  } finally {
    await f.cleanup();
  }
});

test("service cards expand, search and filter, and recalculate choices with quantity", async ({
  page,
}) => {
  const f = await fixture();
  try {
    const loaded = await f.owner.api.rpc("seed_starter_bar", {
      target_organization_id: f.org,
      target_location_id: f.location,
    });
    expect(loaded.error).toBeNull();
    const { data: greyGoose, error } = await f.owner.api
      .from("inventory_products")
      .select("id")
      .eq("organization_id", f.org)
      .eq("brand", "Grey Goose")
      .single();
    expect(error).toBeNull();
    if (!greyGoose) throw new Error("Grey Goose product was not found.");
    const adjusted = await f.owner.api.rpc("record_stock_movement", {
      target_organization_id: f.org,
      target_location_id: f.location,
      target_inventory_product_id: greyGoose.id,
      stock_movement_type: "correction",
      stock_quantity_delta: -1450,
    });
    expect(adjusted.error).toBeNull();

    await page.goto("/login");
    await page.getByLabel("Email address", { exact: true }).fill(f.owner.email);
    await page.getByLabel("Password", { exact: true }).fill(f.owner.password);
    await page
      .locator("form")
      .getByRole("button", { name: "Sign in to Bar Manager", exact: true })
      .click();
    await expect(page).toHaveURL(/dashboard/);
    await page.goto("/service");
    const menu = page.getByRole("region", {
      name: "Service menu",
      exact: true,
    });
    const search = menu.getByRole("searchbox", {
      name: "Search drinks",
      exact: true,
    });
    const spirit = menu.getByRole("combobox", {
      name: "Base spirit",
      exact: true,
    });
    await expect(menu.locator("details[open]")).toHaveCount(0);
    await expect(menu.locator("article:visible")).toHaveCount(6);
    await search.fill("  sMiRnOfF  ");
    await expect(menu.locator("article:visible")).toHaveCount(1);
    await expect(
      menu.getByRole("heading", { name: "Moscow Mule", exact: true }),
    ).toBeVisible();
    await spirit.selectOption({ label: "Gin" });
    await expect(
      menu.getByText("No matching drinks", { exact: true }),
    ).toBeVisible();
    await expect(menu.locator("article:visible")).toHaveCount(0);
    await menu
      .getByRole("button", { name: "Clear filters", exact: true })
      .click();
    await expect(menu.locator("article:visible")).toHaveCount(6);
    await spirit.selectOption({ label: "Gin" });
    await expect(menu.locator("article:visible")).toHaveCount(1);
    await expect(
      menu.getByRole("heading", { name: "Gin and Tonic", exact: true }),
    ).toBeVisible();
    await menu
      .getByRole("button", { name: "Clear filters", exact: true })
      .click();
    await search.fill("lime juice");
    await expect(menu.locator("article:visible")).toHaveCount(3);
    await menu
      .getByRole("button", { name: "Clear filters", exact: true })
      .click();
    const mule = page.locator("article").filter({
      has: page.getByRole("heading", { name: "Moscow Mule", exact: true }),
    });
    const vodka = mule.getByRole("combobox", { name: /^Vodka/ });
    const quantity = mule.getByRole("spinbutton", {
      name: "Quantity",
      exact: true,
    });
    const make = mule.getByRole("button", { name: /^Make \d+ drinks?$/ });
    await expect(mule.locator('input[name="quantity"]')).toBeHidden();
    await mule.locator("summary").focus();
    await mule.locator("summary").press("Enter");
    await expect(quantity).toBeVisible();
    await expect(vodka).toHaveValue("");
    await expect(make).toBeDisabled();
    await quantity.fill("2");
    await expect(vodka).not.toHaveValue("");
    await expect(vodka.locator("option:checked")).toHaveText(/Smirnoff/);
    await expect(make).toBeEnabled();
    await mule.locator("summary").click();
    await expect(mule.locator('input[name="quantity"]')).toBeHidden();
    await mule.locator("summary").click();
    await expect(quantity).toHaveValue("2");
    await quantity.fill("1");
    await expect(vodka).toHaveValue("");
    await expect(make).toBeDisabled();
  } finally {
    await f.cleanup();
  }
});

test("invited bartender can join and pour but cannot manage stock or team", async ({
  page,
}) => {
  const f = await fixture();
  try {
    const member = await f.user();
    const loaded = await f.owner.api.rpc("seed_starter_bar", {
      target_organization_id: f.org,
      target_location_id: f.location,
    });
    expect(loaded.error).toBeNull();
    const { data: invite, error } = await f.owner.api
      .from("organization_invitations")
      .insert({
        organization_id: f.org,
        email: member.email,
        role: "bartender",
      })
      .select("code")
      .single();
    expect(error).toBeNull();
    if (!invite) throw new Error("Invitation was not created.");
    await page.goto("/login");
    await page.getByLabel("Email address", { exact: true }).fill(member.email);
    await page.getByLabel("Password", { exact: true }).fill(member.password);
    await page
      .locator("form")
      .getByRole("button", { name: "Sign in to Bar Manager", exact: true })
      .click();
    await expect(page).toHaveURL(/onboarding/);
    await page.getByLabel("Invitation code", { exact: true }).fill(invite.code);
    await page.getByRole("button", { name: "Join workspace" }).click();
    await expect(page).toHaveURL(/dashboard/);
    await page.goto("/inventory");
    await expect(
      page.getByRole("button", { name: "Create ingredient" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Upload image" }),
    ).toHaveCount(0);
    await expect(page.getByText("Edit product & stock targets")).toHaveCount(0);
    await page.goto("/settings");
    await expect(
      page.getByRole("button", { name: "Create invitation" }),
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Save role" })).toHaveCount(
      0,
    );
    await page.getByRole("radio", { name: "Botanical", exact: true }).check();
    await page.getByRole("button", { name: "Save theme", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-theme",
      "botanical",
    );
    await page.goto("/service");
    const drink = page.locator("article").filter({
      has: page.getByRole("heading", { name: "Gin and Tonic", exact: true }),
    });
    await drink.locator("summary").click();
    await drink
      .getByRole("button", { name: "Make 1 drink", exact: true })
      .click();
    await expect(drink.getByText(/1 drink made/)).toBeVisible();
  } finally {
    await f.cleanup();
  }
});
