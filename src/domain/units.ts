import { z } from "zod";

export type BaseUnit = "ml" | "g" | "each";
export type InputUnit = BaseUnit | "fl_oz";

export function canonicalUnit(unit: InputUnit): BaseUnit {
  return unit === "fl_oz" ? "ml" : unit;
}

// US liquid gallon = 231 cubic inches; 1 inch = 25.4 mm, 128 fl oz/gallon.
// https://www.nist.gov/document/2025-nist-handbook-44-appx-c
export const ML_PER_US_FL_OZ = 29.5735295625;

export const measurementUnitSchema = z.preprocess(
  (value) => (value === null || value === "" ? undefined : value),
  z.enum(["ml", "fl_oz", "g", "each"]).optional(),
);

export function toBaseQuantity(
  value: number,
  unit: InputUnit | undefined,
  baseUnit: BaseUnit,
) {
  if (!Number.isFinite(value)) throw new Error("Enter a finite quantity.");
  if (!unit || unit === baseUnit) return value;
  if (unit === "fl_oz" && baseUnit === "ml") {
    const converted = value * ML_PER_US_FL_OZ;
    if (!Number.isFinite(converted))
      throw new Error("Enter a finite quantity.");
    return converted;
  }
  throw new Error("The selected unit does not match this ingredient.");
}

export function unitLabel(unit: string | undefined) {
  return unit === "fl_oz" ? "fl oz" : (unit ?? "");
}

export function resolveStockUnit(
  baseUnit: BaseUnit,
  selected?: string | null,
): InputUnit {
  const unit = measurementUnitSchema.parse(selected) ?? baseUnit;
  toBaseQuantity(1, unit, baseUnit);
  return unit;
}

export function fromBaseQuantity(
  value: number,
  unit: InputUnit,
  baseUnit: BaseUnit,
) {
  toBaseQuantity(1, unit, baseUnit);
  return unit === "fl_oz" ? value / ML_PER_US_FL_OZ : value;
}

export function formatStockQuantity(
  value: number,
  baseUnit: BaseUnit,
  selected?: string | null,
) {
  const unit = resolveStockUnit(baseUnit, selected);
  const amount = fromBaseQuantity(value, unit, baseUnit).toLocaleString(
    "en-US",
    { maximumFractionDigits: unit === "fl_oz" ? 2 : 3 },
  );
  return `${amount} ${unit === "fl_oz" ? "fl oz" : unit}`;
}

export function formatQuantity(value: number, unit: string | undefined) {
  const amount = value.toLocaleString("en-US", { maximumFractionDigits: 3 });
  if (unit !== "ml") return `${amount}${unit ? ` ${unit}` : ""}`;
  const ounces = (value / ML_PER_US_FL_OZ).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });
  return `${amount} ml (≈${ounces} fl oz)`;
}
