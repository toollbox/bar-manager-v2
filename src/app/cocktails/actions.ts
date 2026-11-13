"use server";

import { revalidateWorkspace } from "@/lib/revalidate-workspace";

import { getMembership, requireUser } from "@/data/auth";
import { cocktailSchema, recipeLineSchema } from "@/domain/cocktails";
import { getIngredientUnit } from "@/data/measurement";
import { toBaseQuantity } from "@/domain/units";

export type CocktailFormState = {
  status?: "success" | "error";
  message?: string;
  errors?: Record<string, string[]>;
};

async function requireRecipeManager() {
  const { supabase, userId } = await requireUser();
  const membership = await getMembership(userId);
  if (!membership || !["owner", "manager"].includes(membership.role)) {
    throw new Error("You do not have permission to manage recipes.");
  }
  return { supabase, membership };
}

function cocktailInput(formData: FormData) {
  return cocktailSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    instructions: formData.get("instructions"),
    glassware: formData.get("glassware"),
    garnish: formData.get("garnish"),
    imageUrl: formData.get("imageUrl"),
  });
}

export async function createCocktail(
  _state: CocktailFormState,
  formData: FormData,
): Promise<CocktailFormState> {
  const result = cocktailInput(formData);
  if (!result.success)
    return { status: "error", errors: result.error.flatten().fieldErrors };
  const { supabase, membership } = await requireRecipeManager();
  const { error } = await supabase.from("cocktails").insert({
    organization_id: membership.organization_id,
    name: result.data.name,
    description: result.data.description ?? null,
    instructions: result.data.instructions,
    glassware: result.data.glassware ?? null,
    garnish: result.data.garnish ?? null,
    image_url: result.data.imageUrl ?? null,
  });
  if (error)
    return {
      status: "error",
      message:
        error.code === "23505"
          ? "A cocktail with this name already exists."
          : "Could not create the cocktail.",
    };
  revalidateWorkspace();
  return {
    status: "success",
    message: `${result.data.name} was created. Add its recipe below.`,
  };
}

export async function updateCocktail(
  cocktailId: string,
  _state: CocktailFormState,
  formData: FormData,
): Promise<CocktailFormState> {
  const result = cocktailInput(formData);
  if (!result.success)
    return { status: "error", errors: result.error.flatten().fieldErrors };
  const { supabase, membership } = await requireRecipeManager();
  const { error } = await supabase
    .from("cocktails")
    .update({
      name: result.data.name,
      description: result.data.description ?? null,
      instructions: result.data.instructions,
      glassware: result.data.glassware ?? null,
      garnish: result.data.garnish ?? null,
      image_url: result.data.imageUrl ?? null,
    })
    .eq("id", cocktailId)
    .eq("organization_id", membership.organization_id);
  if (error)
    return {
      status: "error",
      message:
        error.code === "23505"
          ? "That cocktail name is already in use."
          : "Could not update the cocktail.",
    };
  revalidateWorkspace();
  return { status: "success", message: "Cocktail details updated." };
}

export async function addRecipeLine(
  _state: CocktailFormState,
  formData: FormData,
): Promise<CocktailFormState> {
  const result = recipeLineSchema.safeParse({
    cocktailId: formData.get("cocktailId"),
    ingredientId: formData.get("ingredientId"),
    preferredProductId: formData.get("preferredProductId"),
    selectionPolicy: formData.get("selectionPolicy"),
    quantityInBaseUnit: formData.get("quantityInBaseUnit"),
    quantityUnit: formData.get("quantityUnit"),
    notes: formData.get("notes"),
  });
  if (!result.success)
    return {
      status: "error",
      errors: result.error.flatten().fieldErrors,
      message: "Check the recipe line.",
    };
  const { supabase, membership } = await requireRecipeManager();
  const { data: cocktail } = await supabase
    .from("cocktails")
    .select("id")
    .eq("id", result.data.cocktailId)
    .eq("organization_id", membership.organization_id)
    .single();
  if (!cocktail) return { status: "error", message: "Cocktail not found." };
  const unit = await getIngredientUnit(
    supabase,
    membership.organization_id,
    result.data.ingredientId,
  );
  if (!unit) return { status: "error", message: "Ingredient not found." };
  let quantity;
  try {
    quantity = toBaseQuantity(
      result.data.quantityInBaseUnit,
      result.data.quantityUnit,
      unit,
    );
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Check the amount unit.",
    };
  }
  if (result.data.preferredProductId) {
    const { data: product } = await supabase
      .from("inventory_products")
      .select("id")
      .eq("id", result.data.preferredProductId)
      .eq("ingredient_id", result.data.ingredientId)
      .eq("organization_id", membership.organization_id)
      .single();
    if (!product)
      return {
        status: "error",
        message: "That product does not match the selected ingredient.",
      };
  }
  const { error } = await supabase.from("cocktail_ingredients").insert({
    organization_id: membership.organization_id,
    cocktail_id: result.data.cocktailId,
    ingredient_id: result.data.ingredientId,
    preferred_product_id: result.data.preferredProductId,
    selection_policy: result.data.selectionPolicy,
    quantity_in_base_unit: quantity,
    notes: result.data.notes,
  });
  if (error)
    return {
      status: "error",
      message:
        error.code === "23505"
          ? "That ingredient is already in this recipe."
          : "Could not add the recipe ingredient.",
    };
  revalidateWorkspace();
  return { status: "success", message: "Recipe ingredient added." };
}

export async function deleteRecipeLine(
  _state: CocktailFormState,
  formData: FormData,
): Promise<CocktailFormState> {
  const id = String(formData.get("id") ?? "");
  const { supabase, membership } = await requireRecipeManager();
  const { error } = await supabase
    .from("cocktail_ingredients")
    .delete()
    .eq("id", id)
    .eq("organization_id", membership.organization_id)
    .select("id")
    .single();
  if (error)
    return { status: "error", message: "Could not remove recipe ingredient." };
  revalidateWorkspace();
  return {
    status: "success",
    message: "Recipe ingredient removed. Past production is preserved.",
  };
}

export async function archiveCocktail(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { supabase, membership } = await requireRecipeManager();
  const { error } = await supabase
    .from("cocktails")
    .update({ is_active: false })
    .eq("id", id)
    .eq("organization_id", membership.organization_id)
    .select("id")
    .single();
  if (error) throw new Error("Could not archive cocktail.");
  revalidateWorkspace();
}
