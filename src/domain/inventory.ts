import { z } from "zod";
import { measurementUnitSchema, toBaseQuantity, type BaseUnit } from "./units";

export const baseUnits = ["g", "ml", "fl_oz", "each"] as const;

export const ingredientSchema = z.object({
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(80),
  baseUnit: z.enum(baseUnits),
});

export const createIngredientSchema = z.object({
  name: z.string().trim().min(2, "Enter an ingredient name.").max(120),
  category: z.string().trim().min(2, "Enter a category.").max(80),
  baseUnit: z.enum(baseUnits),
  imageUrl: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.url("Enter a valid HTTPS image URL.").startsWith("https://").optional(),
  ),
});

export const inventoryProductSchema = z.object({
  ingredientId: z.uuid(),
  brand: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(160),
  variant: z.string().trim().max(120).optional(),
  bottleSize: z.number().positive().optional(),
  barcode: z.string().trim().max(80).optional(),
  sku: z.string().trim().max(80).optional(),
  defaultCost: z.number().nonnegative().optional(),
});

const optionalNumber = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.number().nonnegative().optional(),
);

export const createInventoryProductSchema = z
  .object({
    ingredientId: z.uuid(),
    locationId: z.uuid(),
    brand: z.string().trim().min(1, "Enter a brand.").max(120),
    name: z.string().trim().min(1, "Enter a product name.").max(160),
    variant: z.preprocess(
      (value) => (value === "" || value === null ? undefined : value),
      z.string().trim().max(120).optional(),
    ),
    bottleSize: optionalNumber.pipe(z.number().positive().optional()),
    bottleSizeUnit: measurementUnitSchema,
    stockUnit: measurementUnitSchema,
    defaultCost: optionalNumber,
    openingQuantity: z.coerce.number().nonnegative(),
    openingQuantityUnit: measurementUnitSchema,
    reorderPoint: z.coerce.number().nonnegative(),
    reorderPointUnit: measurementUnitSchema,
    targetStock: z.coerce.number().nonnegative(),
    targetStockUnit: measurementUnitSchema,
    imageUrl: z.preprocess(
      (value) => (value === "" || value === null ? undefined : value),
      z.url("Enter a valid HTTPS image URL.").startsWith("https://").optional(),
    ),
  })
  .refine(
    (value) =>
      value.targetStockUnit !== value.reorderPointUnit ||
      value.targetStock >= value.reorderPoint,
    {
      message: "Target stock must be at least the reorder point.",
      path: ["targetStock"],
    },
  );

export function normalizeProductQuantities(
  input: z.infer<typeof createInventoryProductSchema>,
  baseUnit: BaseUnit,
) {
  const quantities = {
    bottleSize:
      input.bottleSize === undefined
        ? undefined
        : toBaseQuantity(input.bottleSize, input.bottleSizeUnit, baseUnit),
    openingQuantity: toBaseQuantity(
      input.openingQuantity,
      input.openingQuantityUnit,
      baseUnit,
    ),
    reorderPoint: toBaseQuantity(
      input.reorderPoint,
      input.reorderPointUnit,
      baseUnit,
    ),
    targetStock: toBaseQuantity(
      input.targetStock,
      input.targetStockUnit,
      baseUnit,
    ),
  };
  if (quantities.targetStock < quantities.reorderPoint)
    throw new Error("Target stock must be at least the reorder point.");
  return quantities;
}

export const manualMovementTypes = [
  "purchase",
  "waste",
  "spill",
  "correction",
] as const;

export const stockMovementSchema = z.object({
  productId: z.uuid(),
  locationId: z.uuid(),
  movementType: z.enum(manualMovementTypes),
  correctionDirection: z.enum(["add", "remove"]).default("add"),
  quantity: z.coerce.number().positive("Enter a quantity greater than zero."),
  quantityUnit: measurementUnitSchema,
  notes: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().trim().max(1000).optional(),
  ),
});

export const recipeSelectionPolicies = [
  "any_product",
  "prefer_product",
  "require_product",
] as const;

export const recipeItemSchema = z
  .object({
    ingredientId: z.uuid(),
    preferredProductId: z.uuid().optional(),
    selectionPolicy: z.enum(recipeSelectionPolicies),
    quantityInBaseUnit: z.number().positive(),
  })
  .superRefine((item, context) => {
    if (
      item.selectionPolicy === "require_product" &&
      !item.preferredProductId
    ) {
      context.addIssue({
        code: "custom",
        message: "A required product must be selected.",
        path: ["preferredProductId"],
      });
    }
  });

export type IngredientInput = z.infer<typeof ingredientSchema>;
export type InventoryProductInput = z.infer<typeof inventoryProductSchema>;
export type RecipeItemInput = z.infer<typeof recipeItemSchema>;
