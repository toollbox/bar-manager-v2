import "server-only";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;

  if (error || !userId) redirect("/login");

  return { supabase, userId, email: data.claims.email as string | undefined };
}

export async function getMembership(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", userId)
    .order("created_at");

  if (error) throw new Error("Unable to load organization membership.");
  const selected = (await cookies()).get("bar-organization")?.value;
  return (
    data?.find((item) => item.organization_id === selected) ?? data?.[0] ?? null
  );
}
