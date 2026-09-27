"use server";

import { revalidatePath } from "next/cache";

import { getMembership, requireUser } from "@/data/auth";
import {
  createIngredientSchema,
  createInventoryProductSchema,
  stockMovementSchema,
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
    imageUrl: formData.get("imageUrl"),
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
    image_url: result.data.imageUrl,
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
    imageUrl: formData.get("imageUrl"),
  });

  if (!result.success) {
    return { status: "error", errors: result.error.flatten().fieldErrors };
  }

  const { supabase, membership } = await requireInventoryManager();
  const { data: productId, error } = await supabase.rpc("create_inventory_product", {
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

  if (result.data.imageUrl) {
    const { error: imageError } = await supabase
      .from("inventory_products")
      .update({ image_url: result.data.imageUrl })
      .eq("id", productId)
      .eq("organization_id", membership.organization_id);

    if (imageError) {
      return {
        status: "error",
        message: "Product was added, but its image URL could not be saved.",
      };
    }
  }

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  return {
    status: "success",
    message: `${result.data.brand} ${result.data.name} was added.`,
  };
}

export async function updateCatalogImage(
  entityType: "ingredients" | "products" | "cocktails",
  entityId: string,
  imagePath: string,
) {
  const { supabase, membership } = await requireInventoryManager();
  const expectedPrefix = `${membership.organization_id}/${entityType}/${entityId}/`;

  if (!imagePath.startsWith(expectedPrefix)) {
    return { error: "Invalid image path." };
  }

  const table = entityType === "ingredients"
    ? "ingredients"
    : entityType === "products"
      ? "inventory_products"
      : "cocktails";
  const { error } = await supabase
    .from(table)
    .update({ image_path: imagePath })
    .eq("id", entityId)
    .eq("organization_id", membership.organization_id);

  if (error) return { error: "Could not attach the uploaded image." };

  revalidatePath(entityType === "cocktails" ? "/cocktails" : "/inventory");
  return { error: null };
}

export async function recordStockMovement(
  _state: InventoryFormState,
  formData: FormData,
): Promise<InventoryFormState> {
  const result = stockMovementSchema.safeParse({
    productId: formData.get("productId"),
    locationId: formData.get("locationId"),
    movementType: formData.get("movementType"),
    correctionDirection: formData.get("correctionDirection"),
    quantity: formData.get("quantity"),
    notes: formData.get("notes"),
  });

  if (!result.success) {
    return { status: "error", errors: result.error.flatten().fieldErrors };
  }

  const { supabase, membership } = await requireInventoryManager();
  const shouldSubtract =
    result.data.movementType === "waste" ||
    result.data.movementType === "spill" ||
    (result.data.movementType === "correction" &&
      result.data.correctionDirection === "remove");
  const quantityDelta = shouldSubtract
    ? -result.data.quantity
    : result.data.quantity;

  const { data: balance, error } = await supabase.rpc(
    "record_stock_movement",
    {
      target_organization_id: membership.organization_id,
      target_location_id: result.data.locationId,
      target_inventory_product_id: result.data.productId,
      stock_movement_type: result.data.movementType,
      stock_quantity_delta: quantityDelta,
      movement_notes: result.data.notes,
    },
  );

  if (error) {
    return {
      status: "error",
      message: error.message.includes("Insufficient inventory")
        ? "This movement would make inventory negative."
        : "Could not record the stock movement.",
    };
  }

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  return {
    status: "success",
    message: `Movement recorded. New balance: ${Number(balance).toLocaleString()}.`,
  };
}
