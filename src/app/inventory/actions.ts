"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { revalidateWorkspace } from "@/lib/revalidate-workspace";

import { getMembership, requireUser } from "@/data/auth";
import { getIngredientUnit, getProductMeasurement } from "@/data/measurement";
import {
  canonicalUnit,
  formatStockQuantity,
  resolveStockUnit,
  toBaseQuantity,
} from "@/domain/units";
import {
  createIngredientSchema,
  createInventoryProductSchema,
  normalizeProductQuantities,
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
    base_unit: canonicalUnit(result.data.baseUnit),
    default_unit: result.data.baseUnit,
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

  revalidateWorkspace();
  return { status: "success", message: `${result.data.name} was created.` };
}

export async function createInventoryProduct(
  _state: InventoryFormState,
  formData: FormData,
): Promise<InventoryFormState> {
  const result = createInventoryProductSchema.safeParse({
    ...Object.fromEntries(formData),
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
  const unit = await getIngredientUnit(
    supabase,
    membership.organization_id,
    result.data.ingredientId,
  );
  if (!unit) return { status: "error", message: "Ingredient not found." };
  let quantities;
  let stockUnit;
  try {
    quantities = normalizeProductQuantities(result.data, unit);
    stockUnit = resolveStockUnit(
      unit,
      result.data.stockUnit ?? result.data.bottleSizeUnit,
    );
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Check the units and quantities.",
    };
  }
  const { data: productId, error } = await supabase.rpc(
    "create_inventory_product",
    {
      target_organization_id: membership.organization_id,
      target_location_id: result.data.locationId,
      target_ingredient_id: result.data.ingredientId,
      product_brand: result.data.brand,
      product_name: result.data.name,
      product_variant: result.data.variant || undefined,
      product_bottle_size: quantities.bottleSize,
      product_stock_unit: stockUnit,
      opening_quantity: quantities.openingQuantity,
      product_reorder_point: quantities.reorderPoint,
      product_target_stock: quantities.targetStock,
    },
  );

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

  revalidateWorkspace();
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
  if (
    !z.enum(["ingredients", "products", "cocktails"]).safeParse(entityType)
      .success ||
    !z.uuid().safeParse(entityId).success
  ) {
    return { error: "Invalid catalog item." };
  }
  const { supabase, membership } = await requireInventoryManager();
  const expectedPrefix = `${membership.organization_id}/${entityType}/${entityId}/`;

  if (!imagePath.startsWith(expectedPrefix)) {
    return { error: "Invalid image path." };
  }

  const table =
    entityType === "ingredients"
      ? "ingredients"
      : entityType === "products"
        ? "inventory_products"
        : "cocktails";
  const { error } = await supabase
    .from(table)
    .update({ image_path: imagePath })
    .eq("id", entityId)
    .eq("organization_id", membership.organization_id)
    .select("id")
    .single();

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
    quantityUnit: formData.get("quantityUnit"),
    notes: formData.get("notes"),
  });

  if (!result.success) {
    return { status: "error", errors: result.error.flatten().fieldErrors };
  }

  const { supabase, membership } = await requireInventoryManager();
  const measurement = await getProductMeasurement(
    supabase,
    membership.organization_id,
    result.data.productId,
  );
  if (!measurement) return { status: "error", message: "Product not found." };
  const unit = measurement.baseUnit;
  let quantity;
  try {
    quantity = toBaseQuantity(
      result.data.quantity,
      result.data.quantityUnit,
      unit,
    );
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Check the quantity unit.",
    };
  }
  const shouldSubtract =
    result.data.movementType === "waste" ||
    result.data.movementType === "spill" ||
    (result.data.movementType === "correction" &&
      result.data.correctionDirection === "remove");
  const quantityDelta = shouldSubtract ? -quantity : quantity;

  const { data: balance, error } = await supabase.rpc("record_stock_movement", {
    target_organization_id: membership.organization_id,
    target_location_id: result.data.locationId,
    target_inventory_product_id: result.data.productId,
    stock_movement_type: result.data.movementType,
    stock_quantity_delta: quantityDelta,
    movement_notes: result.data.notes,
  });

  if (error) {
    return {
      status: "error",
      message: error.message.includes("Insufficient inventory")
        ? "This movement would make inventory negative."
        : "Could not record the stock movement.",
    };
  }

  revalidateWorkspace();
  return {
    status: "success",
    message: `Movement recorded. New balance: ${formatStockQuantity(Number(balance), unit, measurement.stockUnit)}.`,
  };
}

export async function updateIngredient(
  id: string,
  _state: InventoryFormState,
  formData: FormData,
): Promise<InventoryFormState> {
  const result = createIngredientSchema.safeParse(Object.fromEntries(formData));
  if (!z.uuid().safeParse(id).success || !result.success)
    return { status: "error", message: "Check the ingredient details." };
  const { supabase, membership } = await requireInventoryManager();
  const { error, data } = await supabase
    .from("ingredients")
    .update({
      name: result.data.name,
      category: result.data.category,
      base_unit: canonicalUnit(result.data.baseUnit),
      default_unit: result.data.baseUnit,
      image_url: result.data.imageUrl ?? null,
    })
    .eq("id", id)
    .eq("organization_id", membership.organization_id)
    .select("id")
    .single();
  if (error || !data)
    return {
      status: "error",
      message: error?.message.includes("Base unit")
        ? "Base unit cannot change once this ingredient is used."
        : "Could not save ingredient. Check for a duplicate name.",
    };
  revalidateWorkspace();
  return { status: "success", message: "Ingredient saved." };
}

export async function updateProduct(
  id: string,
  ingredientId: string,
  _state: InventoryFormState,
  formData: FormData,
): Promise<InventoryFormState> {
  const result = createInventoryProductSchema.safeParse({
    ...Object.fromEntries(formData),
    ingredientId,
    openingQuantity: 0,
  });
  if (!z.uuid().safeParse(id).success || !result.success)
    return {
      status: "error",
      message:
        "Check the product values. Target must be at least the reorder point.",
    };
  const { supabase, membership } = await requireInventoryManager();
  const measurement = await getProductMeasurement(
    supabase,
    membership.organization_id,
    id,
  );
  if (!measurement) return { status: "error", message: "Product not found." };
  const unit = measurement.baseUnit;
  let quantities;
  let stockUnit;
  try {
    quantities = normalizeProductQuantities(result.data, unit);
    stockUnit = resolveStockUnit(
      unit,
      result.data.stockUnit ?? measurement.stockUnit,
    );
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Check the units and quantities.",
    };
  }
  const { error } = await supabase.rpc("update_inventory_product", {
    target_organization_id: membership.organization_id,
    target_location_id: result.data.locationId,
    target_product_id: id,
    product_brand: result.data.brand,
    product_name: result.data.name,
    product_bottle_size: quantities.bottleSize ?? null,
    product_cost: measurement.cost,
    product_stock_unit: stockUnit,
    product_reorder_point: quantities.reorderPoint,
    product_target_stock: quantities.targetStock,
    product_image_url: result.data.imageUrl,
  });
  if (error)
    return { status: "error", message: "Could not save this product." };
  revalidateWorkspace();
  return {
    status: "success",
    message: "Product and location stock targets saved.",
  };
}

export async function setCatalogActive(
  entity: "ingredients" | "inventory_products",
  id: string,
  active: boolean,
  _state: InventoryFormState,
): Promise<InventoryFormState> {
  void _state;
  if (
    !["ingredients", "inventory_products"].includes(entity) ||
    !z.uuid().safeParse(id).success
  )
    return { status: "error", message: "Invalid item." };
  const { supabase, membership } = await requireInventoryManager();
  const { error } = await supabase
    .from(entity)
    .update({ is_active: active })
    .eq("id", id)
    .eq("organization_id", membership.organization_id)
    .select("id")
    .single();
  if (error) return { status: "error", message: "Could not update item." };
  revalidateWorkspace();
  return {
    status: "success",
    message: active ? "Item restored." : "Item archived. History is preserved.",
  };
}
