import { z } from "zod";

export const baseUnits = ["ml", "g", "each"] as const;

export const ingredientSchema = z.object({
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(80),
  baseUnit: z.enum(baseUnits),
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
