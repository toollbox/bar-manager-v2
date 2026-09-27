"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  loginSchema,
  signupSchema,
  type AuthFormState,
} from "@/domain/auth";
import { createClient } from "@/lib/supabase/server";

export async function login(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const result = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(result.data);

  if (error) {
    return { message: "Email or password is incorrect." };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signup(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const result = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp(result.data);

  if (error) {
    return { message: error.message };
  }

  if (!data.session) {
    return { message: "Check your email to confirm your account." };
  }

  revalidatePath("/", "layout");
  redirect("/onboarding");
}
