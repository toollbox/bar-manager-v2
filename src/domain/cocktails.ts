import { z } from "zod";

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().trim().max(max).optional(),
  );

const imageUrl = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.url("Enter a valid HTTPS image URL.").startsWith("https://").optional(),
);

export const cocktailSchema = z.object({
  name: z.string().trim().min(2, "Enter a cocktail name.").max(120),
  description: optionalText(500),
  instructions: z.string().trim().min(3, "Add preparation instructions.").max(4000),
  glassware: optionalText(120),
  garnish: optionalText(240),
  imageUrl,
});

export const recipeLineSchema = z
  .object({
    cocktailId: z.uuid(),
    ingredientId: z.uuid(),
    preferredProductId: z.preprocess(
      (value) => (value === "" || value === null ? undefined : value),
      z.uuid().optional(),
    ),
    selectionPolicy: z.enum(["any_product", "prefer_product", "require_product"]),
    quantityInBaseUnit: z.coerce.number().positive("Enter a quantity greater than zero."),
    notes: optionalText(240),
  })
  .superRefine((line, context) => {
    const needsProduct = line.selectionPolicy !== "any_product";
    if (needsProduct && !line.preferredProductId) {
      context.addIssue({
        code: "custom",
        message: "Choose the preferred or required product.",
        path: ["preferredProductId"],
      });
    }
    if (!needsProduct && line.preferredProductId) {
      context.addIssue({
        code: "custom",
        message: "Any-brand recipes cannot specify a product.",
        path: ["preferredProductId"],
      });
    }
  });
