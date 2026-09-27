import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Enter a valid email address.").trim(),
  password: z.string().min(1, "Enter your password."),
});

export const signupSchema = loginSchema.extend({
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .regex(/[a-zA-Z]/, "Include at least one letter.")
    .regex(/[0-9]/, "Include at least one number."),
});

export const organizationSchema = z.object({
  organizationName: z.string().trim().min(2).max(120),
  locationName: z.string().trim().min(2).max(120),
  timezone: z.string().trim().min(1).max(100),
});

export type AuthFormState = {
  message?: string;
  errors?: Record<string, string[]>;
};

export type OrganizationFormState = AuthFormState;
