import { describe, expect, it } from "vitest";

import { calculateCocktailAvailability } from "@/domain/availability";

const vodka = { lineId: "vodka-line", ingredientId: "vodka", ingredientName: "Vodka", unit: "ml" as const, required: 50 };
const stock = [
  { id: "smirnoff", ingredientId: "vodka", label: "Smirnoff No. 21", quantity: 40, isAvailable: true },
  { id: "grey-goose", ingredientId: "vodka", label: "Grey Goose Original", quantity: 110, isAvailable: true },
];

describe("calculateCocktailAvailability", () => {
  it("offers substitute brands and uses the best-stocked bottle", () => {
    const result = calculateCocktailAvailability([{ ...vodka, selectionPolicy: "any_product", preferredProductId: null }], stock);
    expect(result.canMake).toBe(true);
    expect(result.maxServings).toBe(2);
    expect(result.lines[0].available).toBe(150);
  });

  it("puts the preferred brand first but allows substitutes", () => {
    const result = calculateCocktailAvailability([{ ...vodka, selectionPolicy: "prefer_product", preferredProductId: "smirnoff" }], stock);
    expect(result.canMake).toBe(true);
    expect(result.lines[0].products.map((product) => product.id)).toEqual(["smirnoff", "grey-goose"]);
  });

  it("uses only the required exact brand", () => {
    const result = calculateCocktailAvailability([{ ...vodka, selectionPolicy: "require_product", preferredProductId: "smirnoff" }], stock);
    expect(result.canMake).toBe(false);
    expect(result.maxServings).toBe(0);
    expect(result.lines[0].available).toBe(40);
  });

  it("does not treat an empty recipe as available", () => {
    expect(calculateCocktailAvailability([], stock)).toEqual({ canMake: false, maxServings: 0, lines: [] });
  });
});
