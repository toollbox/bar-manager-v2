"use server";

import { revalidatePath } from "next/cache";

import { getMembership, requireUser } from "@/data/auth";
import {
  createIngredientSchema,
  createInventoryProductSchema,
} from "@/domain/inventory";

export type InventoryFormState = {
  status?: "success" | "error";
  message?: string;
  errors?: Record<string, string[]>;
};

async function requireInventoryManager() {
  const { supabase, userId } = await requireUser();
  const membership = await getMembership(userId);

  if (!membership || !["owner", "manager"].includes(membership.role)) {
    throw new Error("You do not have permission to manage inventory.");
  }

  return { supabase, membership };
}

export async function createIngredient(
  _state: InventoryFormState,
  formData: FormData,
): Promise<InventoryFormState> {
  const result = createIngredientSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    baseUnit: formData.get("baseUnit"),
  });

  if (!result.success) {
    return { status: "error", errors: result.error.flatten().fieldErrors };
  }

  const { supabase, membership } = await requireInventoryManager();
  const { error } = await supabase.from("ingredients").insert({
    organization_id: membership.organization_id,
    name: result.data.name,
    category: result.data.category,
    base_unit: result.data.baseUnit,
  });

  if (error) {
    return {
      status: "error",
      message:
        error.code === "23505"
          ? "That ingredient already exists."
          : "Could not create the ingredient.",
    };
  }

  revalidatePath("/inventory");
  return { status: "success", message: `${result.data.name} was created.` };
}

export async function createInventoryProduct(
  _state: InventoryFormState,
  formData: FormData,
): Promise<InventoryFormState> {
  const result = createInventoryProductSchema.safeParse({
    ingredientId: formData.get("ingredientId"),
    locationId: formData.get("locationId"),
    brand: formData.get("brand"),
    name: formData.get("name"),
    variant: formData.get("variant"),
    bottleSize: formData.get("bottleSize"),
    defaultCost: formData.get("defaultCost"),
    openingQuantity: formData.get("openingQuantity"),
    reorderPoint: formData.get("reorderPoint"),
    targetStock: formData.get("targetStock"),
  });

  if (!result.success) {
    return { status: "error", errors: result.error.flatten().fieldErrors };
  }

  const { supabase, membership } = await requireInventoryManager();
  const { error } = await supabase.rpc("create_inventory_product", {
    target_organization_id: membership.organization_id,
    target_location_id: result.data.locationId,
    target_ingredient_id: result.data.ingredientId,
    product_brand: result.data.brand,
    product_name: result.data.name,
    product_variant: result.data.variant || undefined,
    product_bottle_size: result.data.bottleSize,
    product_default_cost: result.data.defaultCost,
    opening_quantity: result.data.openingQuantity,
    product_reorder_point: result.data.reorderPoint,
    product_target_stock: result.data.targetStock,
  });

  if (error) {
    return { status: "error", message: "Could not add this branded product." };
  }

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  return {
    status: "success",
    message: `${result.data.brand} ${result.data.name} was added.`,
  };
}
