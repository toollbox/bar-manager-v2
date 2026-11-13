import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getMembership, requireUser } from "@/data/auth";

export async function requireWorkspace() {
  const auth = await requireUser();
  const membership = await getMembership(auth.userId);
  if (!membership) redirect("/onboarding");
  const { data: locations, error } = await auth.supabase
    .from("locations")
    .select("id, name, timezone")
    .eq("organization_id", membership.organization_id)
    .order("created_at");
  if (error) throw new Error("Unable to load locations.");
  const selected = (await cookies()).get("bar-location")?.value;
  const location =
    locations?.find((item) => item.id === selected) ?? locations?.[0];
  if (!location) throw new Error("No location was found.");
  return {
    ...auth,
    membership,
    location,
    locations: locations ?? [],
    canManage: membership.role !== "bartender",
  };
}
