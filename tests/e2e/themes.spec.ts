import { test, expect } from "@playwright/test";
import { fixture } from "../../scripts/test-local.mjs";

test("all themes save per user, render across pages, and survive another browser session", async ({
  page,
  browser,
}) => {
  const f = await fixture();
  try {
    const loaded = await f.owner.api.rpc("seed_starter_bar", {
      target_organization_id: f.org,
      target_location_id: f.location,
    });
    expect(loaded.error).toBeNull();
    await page.goto("/login");
    await page.getByLabel("Email address", { exact: true }).fill(f.owner.email);
    await page.getByLabel("Password", { exact: true }).fill(f.owner.password);
    await page
      .locator("form")
      .getByRole("button", { name: "Sign in to Bar Manager", exact: true })
      .click();
    await expect(page).toHaveURL(/dashboard/);
    await page.goto("/settings");
    await expect(page.getByRole("radio")).toHaveCount(5);
    await expect(page.locator("html")).toHaveAttribute(
      "data-theme",
      "warm-linen",
    );
    await expect(
      page.getByRole("button", { name: "Save theme", exact: true }),
    ).toBeDisabled();

    const options = [
      {
        id: "midnight-brass",
        name: "Midnight Brass",
        background: "rgb(21, 26, 32)",
        surface: "rgb(32, 40, 48)",
      },
      {
        id: "warm-linen",
        name: "Warm Linen",
        background: "rgb(245, 243, 238)",
        surface: "rgb(255, 255, 255)",
      },
      {
        id: "botanical",
        name: "Botanical",
        background: "rgb(237, 242, 236)",
        surface: "rgb(251, 253, 249)",
      },
      {
        id: "cobalt",
        name: "Cobalt",
        background: "rgb(240, 244, 250)",
        surface: "rgb(255, 255, 255)",
      },
      {
        id: "bordeaux",
        name: "Bordeaux",
        background: "rgb(245, 239, 234)",
        surface: "rgb(255, 250, 246)",
      },
    ];
    for (const theme of options) {
      await page.getByRole("radio", { name: theme.name, exact: true }).check();
      await page
        .getByRole("button", { name: "Save theme", exact: true })
        .click();
      await expect(
        page.getByText("Theme saved.", { exact: true }),
      ).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute(
        "data-theme",
        theme.id,
      );
      await expect(page.locator("main")).toHaveCSS(
        "background-color",
        theme.background,
      );
      await page.reload();
      await expect(
        page.getByRole("radio", { name: theme.name, exact: true }),
      ).toBeChecked();
      await page.goto("/inventory");
      await expect(page.locator("html")).toHaveAttribute(
        "data-theme",
        theme.id,
      );
      await expect(page.locator("main")).toHaveCSS(
        "background-color",
        theme.background,
      );
      await expect(
        page.getByRole("combobox", { name: "Current location", exact: true }),
      ).toHaveCSS("background-color", theme.surface);
      await page.goto("/service");
      await expect(page.locator("html")).toHaveAttribute(
        "data-theme",
        theme.id,
      );
      await expect(
        page.getByText("6 of 6 available", { exact: true }),
      ).toBeVisible();
      await page.goto("/settings");
    }

    const other = await f.user();
    const hidden = await other.api
      .from("user_preferences")
      .select("theme")
      .eq("user_id", f.owner.id);
    expect(hidden.error).toBeNull();
    expect(hidden.data).toEqual([]);
    const overwrite = await other.api
      .from("user_preferences")
      .upsert({ user_id: f.owner.id, theme: "cobalt" });
    expect(overwrite.error).not.toBeNull();
    const invalid = await f.owner.api
      .from("user_preferences")
      .update({ theme: "unknown-theme" })
      .eq("user_id", f.owner.id);
    expect(invalid.error).not.toBeNull();

    const secondContext = await browser.newContext({
      baseURL: "http://127.0.0.1:3000",
    });
    try {
      const fresh = await secondContext.newPage();
      await fresh.goto("/login");
      await fresh
        .getByLabel("Email address", { exact: true })
        .fill(f.owner.email);
      await fresh
        .getByLabel("Password", { exact: true })
        .fill(f.owner.password);
      await fresh
        .locator("form")
        .getByRole("button", { name: "Sign in to Bar Manager", exact: true })
        .click();
      await expect(fresh).toHaveURL(/dashboard/);
      await expect(fresh.locator("html")).toHaveAttribute(
        "data-theme",
        "bordeaux",
      );
    } finally {
      await secondContext.close();
    }

    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(page).toHaveURL(/login/);
    await expect(page.locator("html")).toHaveAttribute(
      "data-theme",
      "warm-linen",
    );
  } finally {
    await f.cleanup();
  }
});
