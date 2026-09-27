import { describe, expect, it } from "vitest";

import { recipeItemSchema } from "@/domain/inventory";

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
