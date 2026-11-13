import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { resolveStockUnit } from "@/domain/units";

export async function getIngredientUnit(
  client: SupabaseClient<Database>,
  organizationId: string,
  ingredientId: string,
) {
  const { data } = await client
    .from("ingredients")
    .select("base_unit")
    .eq("organization_id", organizationId)
    .eq("id", ingredientId)
    .single();
  return data?.base_unit;
}

export async function getProductMeasurement(
  client: SupabaseClient<Database>,
  organizationId: string,
  productId: string,
) {
  const { data } = await client
    .from("inventory_products")
    .select("ingredient_id, stock_unit, default_cost")
    .eq("organization_id", organizationId)
    .eq("id", productId)
    .single();
  if (!data) return undefined;
  const baseUnit = await getIngredientUnit(
    client,
    organizationId,
    data.ingredient_id,
  );
  return baseUnit
    ? {
        baseUnit,
        stockUnit: resolveStockUnit(baseUnit, data.stock_unit),
        cost: data.default_cost,
      }
    : undefined;
}
