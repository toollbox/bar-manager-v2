import { describe, expect, it } from "vitest";
import type { LineAvailability } from "./availability";
import { resolveServiceSelections } from "./service-selection";

const line: LineAvailability = {
  lineId: "vodka-line",
  ingredientId: "vodka",
  ingredientName: "Vodka",
  unit: "ml",
  required: 50,
  selectionPolicy: "prefer_product",
  preferredProductId: "smirnoff",
  available: 200,
  canMake: true,
  products: [
    {
      id: "smirnoff",
      ingredientId: "vodka",
      label: "Smirnoff",
      quantity: 150,
      isAvailable: true,
    },
    {
      id: "grey-goose",
      ingredientId: "vodka",
      label: "Grey Goose",
      quantity: 50,
      isAvailable: true,
    },
  ],
};

describe("service product selection", () => {
  it("requires an explicit choice when multiple brands are eligible, including a preferred brand", () => {
    expect(resolveServiceSelections([line], 1, {})).toEqual({
      selections: { "vodka-line": "" },
      canSubmit: false,
    });
  });

  it("prefills the only product with enough stock for the selected quantity", () => {
    expect(resolveServiceSelections([line], 2, {})).toEqual({
      selections: { "vodka-line": "smirnoff" },
      canSubmit: true,
    });
    expect(resolveServiceSelections([line], 1, {}).canSubmit).toBe(false);
  });

  it("preserves a valid manual choice but clears one that no longer has enough stock", () => {
    expect(
      resolveServiceSelections([line], 1, { "vodka-line": "grey-goose" })
        .selections["vodka-line"],
    ).toBe("grey-goose");
    const depleted = {
      ...line,
      products: line.products.map((p) => ({ ...p, quantity: 25 })),
    };
    expect(
      resolveServiceSelections([depleted], 1, { "vodka-line": "grey-goose" })
        .canSubmit,
    ).toBe(false);
  });

  it("requires every recipe line and rejects invalid quantities", () => {
    const missing = { ...line, lineId: "missing", products: [] };
    expect(resolveServiceSelections([line, missing], 2, {}).canSubmit).toBe(
      false,
    );
    for (const quantity of [0, -1, 1.5, 101, NaN]) {
      expect(resolveServiceSelections([line], quantity, {}).canSubmit).toBe(
        false,
      );
    }
    expect(resolveServiceSelections([], 1, {}).canSubmit).toBe(false);
  });

  it("does not auto-select a product that was marked unavailable", () => {
    const unavailable = {
      ...line,
      products: line.products.map((p) => ({ ...p, isAvailable: false })),
    };
    expect(resolveServiceSelections([unavailable], 1, {}).canSubmit).toBe(
      false,
    );
  });
});
