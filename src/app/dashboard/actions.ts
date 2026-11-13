"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireWorkspace } from "@/data/workspace";
import { createClient } from "@/lib/supabase/server";

export type StarterBarState = {
  status?: "success" | "error";
  message?: string;
};

export async function loadStarterBar(
  _state: StarterBarState,
): Promise<StarterBarState> {
  void _state;
  const { supabase, membership, location } = await requireWorkspace();
  if (!membership || membership.role !== "owner") {
    return { status: "error", message: "Only an owner can load starter data." };
  }
  if (!location) return { status: "error", message: "No location was found." };
  const { data, error } = await supabase.rpc("seed_starter_bar", {
    target_organization_id: membership.organization_id,
    target_location_id: location.id,
  });
  if (error)
    return { status: "error", message: "Starter data could not be loaded." };
  const result = data as {
    products_created?: number;
    cocktails_created?: number;
  } | null;
  revalidatePath("/dashboard");
  revalidatePath("/inventory");
  revalidatePath("/cocktails");
  revalidatePath("/service");
  revalidatePath("/purchasing");
  return {
    status: "success",
    message:
      result?.products_created || result?.cocktails_created
        ? `Starter bar loaded: ${result.products_created ?? 0} products and ${result.cocktails_created ?? 0} cocktails created.`
        : "Starter bar is already loaded. Existing quantities were preserved.",
  };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
