"use server";

import { z } from "zod";

import { getMembership, requireUser } from "@/data/auth";
import { revalidateWorkspace } from "@/lib/revalidate-workspace";

export type ProductionState = {
  status?: "success" | "error";
  message?: string;
};

const productionSchema = z.object({
  cocktailId: z.uuid(),
  locationId: z.uuid(),
  quantity: z.coerce.number().int().min(1).max(100),
  selections: z.record(z.uuid(), z.uuid()),
  requestId: z.uuid(),
});

export async function makeCocktail(
  _state: ProductionState,
  formData: FormData,
): Promise<ProductionState> {
  let selections: unknown;
  try {
    selections = JSON.parse(String(formData.get("selections") ?? "{}"));
  } catch {
    return {
      status: "error",
      message: "Select a product for every ingredient.",
    };
  }
  const result = productionSchema.safeParse({
    cocktailId: formData.get("cocktailId"),
    locationId: formData.get("locationId"),
    quantity: formData.get("quantity"),
    selections,
    requestId: formData.get("requestId"),
  });
  if (!result.success)
    return {
      status: "error",
      message: "Check the quantity and product selections.",
    };

  const { supabase, userId } = await requireUser();
  const membership = await getMembership(userId);
  if (!membership)
    return { status: "error", message: "Organization membership is required." };

  const { error } = await supabase.rpc("make_cocktail", {
    target_organization_id: membership.organization_id,
    target_location_id: result.data.locationId,
    target_cocktail_id: result.data.cocktailId,
    production_quantity: result.data.quantity,
    product_selections: result.data.selections,
    request_id: result.data.requestId,
  });
  if (error) {
    revalidateWorkspace();
    const message = error.message.includes("Insufficient inventory")
      ? "Stock changed and is no longer sufficient. Review the refreshed quantities."
      : error.message.includes("eligible")
        ? "One of the selected products is not eligible for this recipe."
        : "The drink could not be recorded. No inventory was changed.";
    return { status: "error", message };
  }

  revalidateWorkspace();
  return {
    status: "success",
    message: `${result.data.quantity} drink${result.data.quantity === 1 ? "" : "s"} made. Inventory and history were updated.`,
  };
}
