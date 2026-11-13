import { describe, expect, it } from "vitest";
import {
  formatQuantity,
  formatStockQuantity,
  resolveStockUnit,
  fromBaseQuantity,
  measurementUnitSchema,
  ML_PER_US_FL_OZ,
  toBaseQuantity,
  unitLabel,
} from "./units";
import {
  createInventoryProductSchema,
  normalizeProductQuantities,
} from "./inventory";

describe("US fluid ounce measurements", () => {
  it("converts common recipe and can sizes without rounding stock calculations", () => {
    expect(toBaseQuantity(1.5, "fl_oz", "ml")).toBe(44.36029434375);
    expect(toBaseQuantity(12, "fl_oz", "ml")).toBe(354.88235475);
    expect(toBaseQuantity(1.5, "fl_oz", "ml") * 8).toBe(
      toBaseQuantity(12, "fl_oz", "ml"),
    );
    expect(toBaseQuantity(750, "ml", "ml")).toBe(750);
    expect(750 / ML_PER_US_FL_OZ).toBeCloseTo(25.360517);
  });

  it("keeps legacy base-unit inputs and non-volume quantities unchanged", () => {
    expect(toBaseQuantity(50, undefined, "ml")).toBe(50);
    expect(toBaseQuantity(100, "g", "g")).toBe(100);
    expect(toBaseQuantity(8, "each", "each")).toBe(8);
    expect(formatQuantity(100, "g")).toBe("100 g");
    expect(formatQuantity(8, "each")).toBe("8 each");
  });

  it("rejects mismatched dimensions and invalid or non-finite units", () => {
    expect(() => toBaseQuantity(1, "fl_oz", "g")).toThrow(/does not match/);
    expect(() => toBaseQuantity(1, "ml", "each")).toThrow(/does not match/);
    expect(() => toBaseQuantity(Infinity, "ml", "ml")).toThrow(/finite/);
    expect(() => toBaseQuantity(Number.MAX_VALUE, "fl_oz", "ml")).toThrow(
      /finite/,
    );
    expect(measurementUnitSchema.safeParse("imperial_oz").success).toBe(false);
    expect(measurementUnitSchema.safeParse(null).data).toBeUndefined();
  });

  it("shows both liquid units with rounded, locale-stable display text", () => {
    expect(formatQuantity(50, "ml")).toBe("50 ml (≈1.69 fl oz)");
    expect(formatQuantity(120, "ml")).toBe("120 ml (≈4.06 fl oz)");
    expect(formatQuantity(750, "ml")).toBe("750 ml (≈25.36 fl oz)");
    expect(formatQuantity(0, "ml")).toBe("0 ml (≈0 fl oz)");
    expect(formatQuantity(-44.36029434375, "ml")).toBe(
      "-44.36 ml (≈-1.5 fl oz)",
    );
    expect(unitLabel("ml")).toBe("ml");
    expect(unitLabel("fl_oz")).toBe("fl oz");
  });

  it("shows inventory in only the selected compatible unit", () => {
    expect(formatStockQuantity(400, "ml", "ml")).toBe("400 ml");
    expect(
      formatStockQuantity(toBaseQuantity(13, "fl_oz", "ml"), "ml", "fl_oz"),
    ).toBe("13 fl oz");
    expect(formatStockQuantity(400, "ml")).toBe("400 ml");
    expect(formatStockQuantity(8, "each", "each")).toBe("8 each");
    expect(formatStockQuantity(100, "g", "g")).toBe("100 g");
    expect(fromBaseQuantity(354.88235475, "fl_oz", "ml")).toBe(12);
    expect(() => resolveStockUnit("ml", "each")).toThrow(/does not match/);
  });
});

const product = {
  ingredientId: "7b55c4a1-b7f2-40a3-b5c1-342f724fa8e4",
  locationId: "b2cb66a1-4ddd-4baa-931a-f9368c51c80c",
  brand: "Test",
  name: "12 oz can",
  bottleSize: 12,
  bottleSizeUnit: "fl_oz",
  openingQuantity: 24,
  openingQuantityUnit: "fl_oz",
  reorderPoint: 6,
  reorderPointUnit: "fl_oz",
  targetStock: 750,
  targetStockUnit: "ml",
};

describe("inventory unit normalization", () => {
  it("supports independently entered ml and oz product measurements", () => {
    const input = createInventoryProductSchema.parse(product);
    const result = normalizeProductQuantities(input, "ml");
    expect(result.bottleSize).toBe(354.88235475);
    expect(result.openingQuantity).toBe(709.7647095);
    expect(result.reorderPoint).toBe(177.441177375);
    expect(result.targetStock).toBe(750);
  });

  it("validates stock targets after conversion, rather than comparing raw numbers", () => {
    const input = createInventoryProductSchema.parse({
      ...product,
      reorderPoint: 30,
    });
    expect(() => normalizeProductQuantities(input, "ml")).toThrow(
      /Target stock/,
    );
    expect(() =>
      normalizeProductQuantities(
        createInventoryProductSchema.parse(product),
        "g",
      ),
    ).toThrow(/does not match/);
  });
});
