import { describe, expect, it } from "vitest";

import {
  createIngredientSchema,
  createInventoryProductSchema,
  recipeItemSchema,
  stockMovementSchema,
} from "@/domain/inventory";

const ingredientId = "7b55c4a1-b7f2-40a3-b5c1-342f724fa8e4";

describe("catalog image URLs", () => {
  const ingredient = {
    name: "Vodka",
    category: "Spirit",
    baseUnit: "ml",
  };

  it("accepts an HTTPS image URL", () => {
    const result = createIngredientSchema.safeParse({
      ...ingredient,
      imageUrl: "https://images.example.com/vodka.webp",
    });

    expect(result.success).toBe(true);
  });

  it("rejects an insecure image URL", () => {
    const result = createIngredientSchema.safeParse({
      ...ingredient,
      imageUrl: "http://images.example.com/vodka.webp",
    });

    expect(result.success).toBe(false);
  });
});

describe("ingredient measurement choices", () => {
  it("accepts g, ml, fl oz and each as separate selections", () => {
    for (const baseUnit of ["g", "ml", "fl_oz", "each"]) {
      const result = createIngredientSchema.safeParse({
        name: "Test ingredient",
        category: "Test",
        baseUnit,
      });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.baseUnit).toBe(baseUnit);
    }
  });
});

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

describe("stockMovementSchema", () => {
  it("accepts positive user-entered quantities", () => {
    const result = stockMovementSchema.safeParse({
      productId: "a06db372-9bc3-41bd-9c15-dfbb36b9e943",
      locationId: "b2cb66a1-4ddd-4baa-931a-f9368c51c80c",
      movementType: "waste",
      correctionDirection: "add",
      quantity: "25",
      notes: "Citrus spoiled",
    });

    expect(result.success).toBe(true);
  });

  it("rejects zero-quantity movements", () => {
    const result = stockMovementSchema.safeParse({
      productId: "a06db372-9bc3-41bd-9c15-dfbb36b9e943",
      locationId: "b2cb66a1-4ddd-4baa-931a-f9368c51c80c",
      movementType: "purchase",
      correctionDirection: "add",
      quantity: "0",
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
