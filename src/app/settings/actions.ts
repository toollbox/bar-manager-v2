"use server";

import { cookies } from "next/headers";
import { z } from "zod";

import { requireWorkspace } from "@/data/workspace";
import { requireUser } from "@/data/auth";
import { revalidateWorkspace } from "@/lib/revalidate-workspace";

export type SettingsState = {
  message?: string;
  error?: boolean;
  code?: string;
};

export async function selectOrganization(formData: FormData) {
  const { supabase, userId } = await requireUser();
  const id = String(formData.get("organizationId"));
  const { data } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("organization_id", id)
    .single();
  if (!data) throw new Error("Workspace not found.");
  (await cookies()).set("bar-organization", id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  (await cookies()).delete("bar-location");
  revalidateWorkspace();
}

export async function selectLocation(formData: FormData) {
  const { locations } = await requireWorkspace();
  const id = String(formData.get("locationId"));
  if (!locations.some((location) => location.id === id))
    throw new Error("Location not found.");
  (await cookies()).set("bar-location", id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidateWorkspace();
}

export async function addLocation(
  _state: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const { supabase, membership } = await requireWorkspace();
  if (membership.role !== "owner")
    return { error: true, message: "Only owners can add locations." };
  const result = z
    .object({
      name: z.string().trim().min(2).max(120),
      timezone: z.string().max(100),
    })
    .safeParse({
      name: formData.get("name"),
      timezone: formData.get("timezone"),
    });
  if (!result.success)
    return { error: true, message: "Enter a location name and timezone." };
  const { data, error } = await supabase.rpc("create_location", {
    target_organization_id: membership.organization_id,
    location_name: result.data.name,
    location_timezone: result.data.timezone,
  });
  if (error)
    return {
      error: true,
      message: "Could not add location. Check its name and timezone.",
    };
  (await cookies()).set("bar-location", data, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  revalidateWorkspace();
  return { message: "Location created and selected." };
}

export async function createInvitation(
  _state: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const { supabase, membership } = await requireWorkspace();
  if (membership.role !== "owner")
    return { error: true, message: "Only owners can invite team members." };
  const result = z
    .object({
      email: z.email().trim().toLowerCase(),
      role: z.enum(["manager", "bartender"]),
    })
    .safeParse({ email: formData.get("email"), role: formData.get("role") });
  if (!result.success)
    return { error: true, message: "Enter a valid email and role." };
  const { data, error } = await supabase
    .from("organization_invitations")
    .insert({ organization_id: membership.organization_id, ...result.data })
    .select("code")
    .single();
  if (error) return { error: true, message: "Could not create invitation." };
  revalidateWorkspace();
  return {
    message:
      "Share this code with the recipient. It expires in seven days. They can accept it from Settings or onboarding.",
    code: data.code,
  };
}

export async function acceptInvitation(
  _state: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const code = z.uuid().safeParse(formData.get("code"));
  if (!code.success)
    return { error: true, message: "Enter a valid invitation code." };
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("accept_invitation", {
    invitation_code: code.data,
  });
  if (error)
    return {
      error: true,
      message:
        "Invitation is expired, already used, or for a different email. Verify your account email before accepting.",
    };
  (await cookies()).set("bar-organization", data, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  (await cookies()).delete("bar-location");
  revalidateWorkspace();
  return {
    message: "Invitation accepted. Open the dashboard to enter the workspace.",
  };
}

export async function changeMember(
  _state: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const { supabase, membership } = await requireWorkspace();
  if (membership.role !== "owner")
    return { error: true, message: "Only owners can manage members." };
  const result = z
    .object({
      userId: z.uuid(),
      role: z.enum(["owner", "manager", "bartender", "remove"]),
    })
    .safeParse({ userId: formData.get("userId"), role: formData.get("role") });
  if (!result.success)
    return { error: true, message: "Invalid member or role." };
  const { error } = await supabase.rpc("manage_team_member", {
    target_organization_id: membership.organization_id,
    target_user_id: result.data.userId,
    new_role: result.data.role === "remove" ? undefined : result.data.role,
  });
  if (error)
    return {
      error: true,
      message: error.message.includes("last owner")
        ? "The last owner cannot be removed or demoted."
        : "Could not update member.",
    };
  revalidateWorkspace();
  return { message: "Team member updated." };
}
