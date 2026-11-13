import { test, expect } from "@playwright/test";
import { fixture } from "../../scripts/test-local.mjs";

test("ounce entries work across inventory, recipes, pours, reports and receipts", async ({
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
    await page.goto("/inventory");
    const general = page.locator("article").filter({
      has: page.getByRole("heading", {
        name: "1. General Products",
        exact: true,
      }),
    });
    await general
      .getByLabel("Ingredient name", { exact: true })
      .fill("Test Gin");
    await general
      .getByRole("combobox", { name: "Category", exact: true })
      .selectOption("Spirit");
    await expect(
      general
        .getByRole("combobox", { name: "Base unit", exact: true })
        .locator("option"),
    ).toHaveText(["g", "ml", "fl oz", "each"]);
    await general
      .getByRole("combobox", { name: "Base unit", exact: true })
      .selectOption("fl_oz");
    await general
      .getByRole("button", { name: "Create ingredient", exact: true })
      .click();
    await expect(
      general.getByText("Test Gin was created.", { exact: true }),
    ).toBeVisible();
    const { data: ingredient } = await f.owner.api
      .from("ingredients")
      .select("id, base_unit, default_unit")
      .eq("organization_id", f.org)
      .eq("name", "Test Gin")
      .single();
    if (!ingredient) throw new Error("Test ingredient was not created.");
    expect(ingredient.base_unit).toBe("ml");
    expect(ingredient.default_unit).toBe("fl_oz");
    const create = page.locator("article").filter({
      has: page.getByRole("heading", {
        name: "2. Branded product",
        exact: true,
      }),
    });
    await create
      .getByRole("combobox", { name: "Generic ingredient", exact: true })
      .selectOption(ingredient.id);
    await expect(create.getByLabel("Stock unit", { exact: true })).toHaveValue(
      "fl_oz",
    );
    await create.getByLabel("Stock unit", { exact: true }).selectOption("ml");
    await create.getByLabel("Brand", { exact: true }).fill("Fixture");
    await create.getByLabel("Product name", { exact: true }).fill("12 oz Gin");
    await create.getByLabel("Bottle size", { exact: true }).fill("12");
    await create
      .getByLabel("Stock unit", { exact: true })
      .selectOption("fl_oz");
    await expect(create.getByLabel("Bottle size", { exact: true })).toHaveValue(
      "12",
    );
    await create.getByLabel("Opening stock", { exact: true }).fill("12");
    await create.getByLabel("Reorder point", { exact: true }).fill("1");
    await create.getByLabel("Target stock", { exact: true }).fill("36");
    await expect(create.locator('input[name="defaultCost"]')).toHaveCount(0);
    await create
      .getByRole("button", { name: "Add branded product", exact: true })
      .click();
    await expect(
      create.getByText("Fixture 12 oz Gin was added.", { exact: true }),
    ).toBeVisible();
    await expect(create.getByLabel("Stock unit", { exact: true })).toHaveValue(
      "ml",
    );
    const { data: product } = await f.owner.api
      .from("inventory_products")
      .select("id, bottle_size, stock_unit")
      .eq("organization_id", f.org)
      .single();
    if (!product) throw new Error("Test product was not created.");
    expect(Number(product.bottle_size)).toBe(354.88235475);
    expect(product.stock_unit).toBe("fl_oz");
    const invalidUnit = await f.owner.api
      .from("inventory_products")
      .update({ stock_unit: "each" })
      .eq("id", product.id);
    expect(invalidUnit.error).not.toBeNull();
    const balance = async () => {
      const { data, error } = await f.owner.api
        .from("inventory_balances")
        .select("quantity")
        .eq("location_id", f.location)
        .eq("inventory_product_id", product.id)
        .single();
      expect(error).toBeNull();
      return Number(data?.quantity);
    };
    expect(await balance()).toBe(354.88235475);
    await page.reload();
    const generalProducts = page.locator("section").filter({
      has: page.getByRole("heading", {
        name: "General Products",
        exact: true,
      }),
    });
    const generalRow = generalProducts
      .getByRole("row")
      .filter({ has: page.getByText("Test Gin", { exact: true }) });
    await generalRow.getByText("Edit ingredient", { exact: true }).click();
    await expect(
      generalRow.getByRole("combobox", { name: "Base unit", exact: true }),
    ).toHaveValue("fl_oz");
    await expect(
      generalRow
        .getByRole("combobox", { name: "Base unit", exact: true })
        .locator("option"),
    ).toHaveText(["g", "ml", "fl oz", "each"]);
    const inventoryRow = page
      .getByRole("row")
      .filter({ hasText: "Fixture 12 oz Gin" });
    await expect(
      inventoryRow.getByRole("cell", { name: "12 fl oz", exact: true }),
    ).toBeVisible();
    await expect(
      inventoryRow.getByRole("cell", { name: "1 fl oz", exact: true }),
    ).toBeVisible();
    await expect(inventoryRow).not.toContainText("≈");

    await page.goto("/cocktails");
    const cocktail = page.locator("section").filter({
      has: page.getByRole("heading", {
        name: "Create a cocktail",
        exact: true,
      }),
    });
    await cocktail.getByLabel("Name", { exact: true }).fill("Ounce Test");
    await cocktail
      .getByLabel("Instructions", { exact: true })
      .fill("Pour over ice.");
    await cocktail
      .getByRole("button", { name: "Create cocktail", exact: true })
      .click();
    const recipe = page.locator("article").filter({
      has: page.getByRole("heading", { name: "Ounce Test", exact: true }),
    });
    await recipe
      .getByRole("combobox", { name: "Ingredient", exact: true })
      .selectOption(ingredient.id);
    await recipe
      .getByLabel("Amount unit", { exact: true })
      .selectOption("fl_oz");
    await recipe.getByLabel("Amount", { exact: true }).fill("1.5");
    await recipe
      .getByRole("button", { name: "Add ingredient", exact: true })
      .click();
    await expect(recipe.getByRole("listitem")).toContainText(
      "44.36 ml (≈1.5 fl oz) Test Gin",
    );
    const { data: line } = await f.owner.api
      .from("cocktail_ingredients")
      .select("quantity_in_base_unit")
      .eq("organization_id", f.org)
      .single();
    expect(Number(line?.quantity_in_base_unit)).toBe(44.36029434375);

    await page.goto("/service");
    const service = page.locator("article").filter({
      has: page.getByRole("heading", { name: "Ounce Test", exact: true }),
    });
    await service.locator("summary").click();
    await expect(
      service.getByText("8 servings possible", { exact: true }),
    ).toBeVisible();
    await service
      .getByRole("spinbutton", { name: "Quantity", exact: true })
      .fill("8");
    await service
      .getByRole("button", { name: "Make 8 drinks", exact: true })
      .click();
    await expect(
      page.getByText("0 of 1 available", { exact: true }),
    ).toBeVisible();
    expect(await balance()).toBe(0);
    await page.goto("/reports");
    await page.locator("summary").filter({ hasText: "8 × Ounce Test" }).click();
    await expect(
      page.getByText("Test Gin: Fixture 12 oz Gin · 354.882 ml (≈12 fl oz)", {
        exact: true,
      }),
    ).toBeVisible();

    await page.goto("/purchasing");
    const purchase = page
      .locator("article")
      .filter({ hasText: "Fixture 12 oz Gin" });
    await purchase
      .getByLabel("Quantity received unit", { exact: true })
      .selectOption("fl_oz");
    await purchase.getByLabel("Quantity received", { exact: true }).fill("12");
    await purchase
      .getByRole("button", { name: "Receive", exact: true })
      .click();
    await expect(purchase).toHaveCount(0);
    expect(await balance()).toBe(354.88235475);

    await page.goto("/inventory");
    const movement = page.locator("section").filter({
      has: page.getByRole("heading", {
        name: "Record a stock movement",
        exact: true,
      }),
    });
    await movement
      .getByRole("combobox", { name: "Operation", exact: true })
      .selectOption("waste");
    await movement
      .getByLabel("Quantity unit", { exact: true })
      .selectOption("fl_oz");
    await movement.getByLabel("Quantity", { exact: true }).fill("1.5");
    await movement.getByRole("button", { name: "Record", exact: true }).click();
    await expect(
      movement.getByText("Movement recorded. New balance: 10.5 fl oz.", {
        exact: true,
      }),
    ).toBeVisible();
    expect(await balance()).toBe(310.52206040625);
    const row = page.getByRole("row").filter({ hasText: "Fixture 12 oz Gin" });
    await row
      .getByText("Edit product & stock targets", { exact: true })
      .click();
    await expect(row.locator('input[name="defaultCost"]')).toHaveCount(0);
    await expect(row.getByLabel("Stock unit", { exact: true })).toHaveValue(
      "fl_oz",
    );
    await expect(row.getByLabel("Package size", { exact: true })).toHaveValue(
      "12",
    );
    await row.getByLabel("Package size", { exact: true }).fill("16");
    await row
      .getByRole("button", { name: "Save product", exact: true })
      .click();
    await expect(
      row.getByText("Product and location stock targets saved.", {
        exact: true,
      }),
    ).toBeVisible();
    const { data: updated } = await f.owner.api
      .from("inventory_products")
      .select("bottle_size")
      .eq("id", product.id)
      .single();
    expect(Number(updated?.bottle_size)).toBe(473.176473);
    await page.reload();
    await row
      .getByText("Edit product & stock targets", { exact: true })
      .click();
    await expect(row.getByLabel("Stock unit", { exact: true })).toHaveValue(
      "fl_oz",
    );
    await expect(row.getByLabel("Package size", { exact: true })).toHaveValue(
      "16",
    );
    await row.getByLabel("Stock unit", { exact: true }).selectOption("ml");
    await expect(row.getByLabel("Package size", { exact: true })).toHaveValue(
      "473.176473",
    );
    await row
      .getByRole("button", { name: "Save product", exact: true })
      .click();
    await expect(
      row.getByText("Product and location stock targets saved.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      row.getByRole("cell", { name: "310.522 ml", exact: true }),
    ).toBeVisible();
    expect(await balance()).toBe(310.52206040625);
    await page.reload();
    await row
      .getByText("Edit product & stock targets", { exact: true })
      .click();
    await expect(row.getByLabel("Stock unit", { exact: true })).toHaveValue(
      "ml",
    );
    const legacyCategory = await f.owner.api
      .from("ingredients")
      .update({ category: "House Specialty" })
      .eq("id", ingredient.id);
    expect(legacyCategory.error).toBeNull();
    await page.reload();
    await generalRow.getByText("Edit ingredient", { exact: true }).click();
    await expect(
      generalRow.getByRole("combobox", { name: "Category", exact: true }),
    ).toHaveValue("House Specialty");
    await generalRow
      .getByRole("combobox", { name: "Base unit", exact: true })
      .selectOption("ml");
    await generalRow
      .getByRole("button", { name: "Save ingredient", exact: true })
      .click();
    await expect(
      generalRow.getByText("Ingredient saved.", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await generalRow.getByText("Edit ingredient", { exact: true }).click();
    await expect(
      generalRow.getByRole("combobox", { name: "Base unit", exact: true }),
    ).toHaveValue("ml");
    await generalRow
      .getByRole("combobox", { name: "Base unit", exact: true })
      .selectOption("fl_oz");
    await generalRow
      .getByRole("button", { name: "Save ingredient", exact: true })
      .click();
    await expect(
      generalRow.getByText("Ingredient saved.", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await generalRow.getByText("Edit ingredient", { exact: true }).click();
    await expect(
      generalRow.getByRole("combobox", { name: "Base unit", exact: true }),
    ).toHaveValue("fl_oz");
    await expect(
      generalRow.getByRole("combobox", { name: "Category", exact: true }),
    ).toHaveValue("House Specialty");
    await expect(
      general
        .getByRole("combobox", { name: "Category", exact: true })
        .getByRole("option", { name: "House Specialty", exact: true }),
    ).toHaveCount(1);
    expect(await balance()).toBe(310.52206040625);
  } finally {
    await f.cleanup();
  }
});
