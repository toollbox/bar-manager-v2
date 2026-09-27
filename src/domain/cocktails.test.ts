import { describe, expect, it } from "vitest";

import { cocktailSchema, recipeLineSchema } from "@/domain/cocktails";

const ids = {
  cocktailId: "8f7393f3-06a0-4e54-9839-ac7583e34d55",
  ingredientId: "7b55c4a1-b7f2-40a3-b5c1-342f724fa8e4",
  productId: "a06db372-9bc3-41bd-9c15-dfbb36b9e943",
};

describe("cocktailSchema", () => {
  it("accepts a cocktail with optional presentation details", () => {
    expect(cocktailSchema.safeParse({
      name: "Margarita",
      instructions: "Shake with ice and strain.",
      glassware: "Coupe",
      imageUrl: "https://images.example.com/margarita.webp",
    }).success).toBe(true);
  });
});

describe("recipeLineSchema", () => {
  it("accepts any available brand without a selected product", () => {
    expect(recipeLineSchema.safeParse({
      cocktailId: ids.cocktailId,
      ingredientId: ids.ingredientId,
      selectionPolicy: "any_product",
      quantityInBaseUnit: "50",
    }).success).toBe(true);
  });

  it("requires a product for preferred-brand recipes", () => {
    expect(recipeLineSchema.safeParse({
      cocktailId: ids.cocktailId,
      ingredientId: ids.ingredientId,
      selectionPolicy: "prefer_product",
      quantityInBaseUnit: "50",
    }).success).toBe(false);
  });

  it("accepts a required product", () => {
    expect(recipeLineSchema.safeParse({
      cocktailId: ids.cocktailId,
      ingredientId: ids.ingredientId,
      preferredProductId: ids.productId,
      selectionPolicy: "require_product",
      quantityInBaseUnit: "50",
    }).success).toBe(true);
  });
});
