"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  organizationSchema,
  type OrganizationFormState,
} from "@/domain/auth";
import { createClient } from "@/lib/supabase/server";

export async function createOrganization(
  _state: OrganizationFormState,
  formData: FormData,
): Promise<OrganizationFormState> {
  const result = organizationSchema.safeParse({
    organizationName: formData.get("organizationName"),
    locationName: formData.get("locationName"),
    timezone: formData.get("timezone"),
  });

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (!userId) redirect("/login");

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    return { message: "We could not check your organization membership." };
  }

  if (membership) redirect("/dashboard");

  const { error } = await supabase.rpc("create_organization", {
    organization_name: result.data.organizationName,
    first_location_name: result.data.locationName,
    location_timezone: result.data.timezone,
  });

  if (error) {
    return { message: "We could not create your workspace. Please try again." };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
