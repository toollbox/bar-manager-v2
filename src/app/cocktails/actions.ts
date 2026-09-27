"use server";

import { revalidatePath } from "next/cache";

import { getMembership, requireUser } from "@/data/auth";
import { cocktailSchema, recipeLineSchema } from "@/domain/cocktails";

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
  if (!result.success) return { status: "error", errors: result.error.flatten().fieldErrors };
  const { supabase, membership } = await requireRecipeManager();
  const { error } = await supabase.from("cocktails").insert({
    organization_id: membership.organization_id,
    name: result.data.name,
    description: result.data.description,
    instructions: result.data.instructions,
    glassware: result.data.glassware,
    garnish: result.data.garnish,
    image_url: result.data.imageUrl,
  });
  if (error) return { status: "error", message: error.code === "23505" ? "A cocktail with this name already exists." : "Could not create the cocktail." };
  revalidatePath("/cocktails");
  revalidatePath("/dashboard");
  return { status: "success", message: `${result.data.name} was created. Add its recipe below.` };
}

export async function updateCocktail(
  cocktailId: string,
  _state: CocktailFormState,
  formData: FormData,
): Promise<CocktailFormState> {
  const result = cocktailInput(formData);
  if (!result.success) return { status: "error", errors: result.error.flatten().fieldErrors };
  const { supabase, membership } = await requireRecipeManager();
  const { error } = await supabase.from("cocktails").update({
    name: result.data.name,
    description: result.data.description,
    instructions: result.data.instructions,
    glassware: result.data.glassware,
    garnish: result.data.garnish,
    image_url: result.data.imageUrl,
  }).eq("id", cocktailId).eq("organization_id", membership.organization_id);
  if (error) return { status: "error", message: error.code === "23505" ? "That cocktail name is already in use." : "Could not update the cocktail." };
  revalidatePath("/cocktails");
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
    notes: formData.get("notes"),
  });
  if (!result.success) return { status: "error", errors: result.error.flatten().fieldErrors, message: "Check the recipe line." };
  const { supabase, membership } = await requireRecipeManager();
  const { data: cocktail } = await supabase.from("cocktails").select("id").eq("id", result.data.cocktailId).eq("organization_id", membership.organization_id).single();
  if (!cocktail) return { status: "error", message: "Cocktail not found." };
  if (result.data.preferredProductId) {
    const { data: product } = await supabase.from("inventory_products").select("id").eq("id", result.data.preferredProductId).eq("ingredient_id", result.data.ingredientId).eq("organization_id", membership.organization_id).single();
    if (!product) return { status: "error", message: "That product does not match the selected ingredient." };
  }
  const { error } = await supabase.from("cocktail_ingredients").insert({
    organization_id: membership.organization_id,
    cocktail_id: result.data.cocktailId,
    ingredient_id: result.data.ingredientId,
    preferred_product_id: result.data.preferredProductId,
    selection_policy: result.data.selectionPolicy,
    quantity_in_base_unit: result.data.quantityInBaseUnit,
    notes: result.data.notes,
  });
  if (error) return { status: "error", message: error.code === "23505" ? "That ingredient is already in this recipe." : "Could not add the recipe ingredient." };
  revalidatePath("/cocktails");
  return { status: "success", message: "Recipe ingredient added." };
}

export async function deleteRecipeLine(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { supabase, membership } = await requireRecipeManager();
  await supabase.from("cocktail_ingredients").delete().eq("id", id).eq("organization_id", membership.organization_id);
  revalidatePath("/cocktails");
}

export async function archiveCocktail(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { supabase, membership } = await requireRecipeManager();
  await supabase.from("cocktails").update({ is_active: false }).eq("id", id).eq("organization_id", membership.organization_id);
  revalidatePath("/cocktails");
  revalidatePath("/dashboard");
}
