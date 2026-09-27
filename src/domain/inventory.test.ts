import { describe, expect, it } from "vitest";

import {
  createInventoryProductSchema,
  recipeItemSchema,
} from "@/domain/inventory";

const ingredientId = "7b55c4a1-b7f2-40a3-b5c1-342f724fa8e4";

describe("recipeItemSchema", () => {
  it("allows a recipe to use any brand for a generic ingredient", () => {
    const result = recipeItemSchema.safeParse({
      ingredientId,
      selectionPolicy: "any_product",
      quantityInBaseUnit: 50,
    });

    expect(result.success).toBe(true);
  });

  it("requires a product when the recipe mandates a brand", () => {
    const result = recipeItemSchema.safeParse({
      ingredientId,
      selectionPolicy: "require_product",
      quantityInBaseUnit: 50,
    });

    expect(result.success).toBe(false);
  });
});

describe("createInventoryProductSchema", () => {
  it("coerces numeric form values", () => {
    const result = createInventoryProductSchema.safeParse({
      ingredientId,
      locationId: "b2cb66a1-4ddd-4baa-931a-f9368c51c80c",
      brand: "Smirnoff",
      name: "No. 21 Vodka",
      variant: "",
      bottleSize: "750",
      defaultCost: "18.99",
      openingQuantity: "1500",
      reorderPoint: "750",
      targetStock: "4500",
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.bottleSize).toBe(750);
  });

  it("rejects a target below the reorder point", () => {
    const result = createInventoryProductSchema.safeParse({
      ingredientId,
      locationId: "b2cb66a1-4ddd-4baa-931a-f9368c51c80c",
      brand: "Smirnoff",
      name: "No. 21 Vodka",
      bottleSize: "750",
      defaultCost: "18.99",
      openingQuantity: "1500",
      reorderPoint: "3000",
      targetStock: "750",
    });

    expect(result.success).toBe(false);
  });
});
