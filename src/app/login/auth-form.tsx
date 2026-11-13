"use client";

import { useActionState, useState } from "react";

import { login, signup } from "@/app/login/actions";
import type { AuthFormState } from "@/domain/auth";

const initialState: AuthFormState = {};

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1.5 text-sm text-danger">{errors[0]}</p>;
}

export function AuthForm() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const action = mode === "login" ? login : signup;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <div>
      <div className="mb-8 grid grid-cols-2 rounded-xl bg-surface-subtle p-1">
        {(["login", "signup"] as const).map((value) => (
          <button
            className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
              mode === value
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            key={value}
            onClick={() => setMode(value)}
            type="button"
          >
            {value === "login" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      <form action={formAction} className="space-y-5" key={mode}>
        <div>
          <label className="text-sm font-medium text-foreground" htmlFor="email">
            Email address
          </label>
          <input
            autoComplete="email"
            autoFocus
            className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 text-foreground outline-none transition placeholder:text-muted-foreground focus:border-accent focus:ring-4 focus:ring-accent/10"
            id="email"
            name="email"
            placeholder="you@yourbar.com"
            required
            type="email"
          />
          <FieldError errors={state.errors?.email} />
        </div>

        <div>
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="password"
          >
            Password
          </label>
          <input
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 text-foreground outline-none transition placeholder:text-muted-foreground focus:border-accent focus:ring-4 focus:ring-accent/10"
            id="password"
            minLength={mode === "signup" ? 8 : undefined}
            name="password"
            placeholder={mode === "signup" ? "8+ characters" : "Your password"}
            required
            type="password"
          />
          <FieldError errors={state.errors?.password} />
        </div>

        {state.message ? (
          <p
            aria-live="polite"
            className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger"
          >
            {state.message}
          </p>
        ) : null}

        <button
          className="w-full rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending
            ? "Please wait…"
            : mode === "login"
              ? "Sign in to Bar Manager"
              : "Create your account"}
        </button>
      </form>

      {mode === "signup" ? (
        <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
          Use at least 8 characters with a letter and a number.
        </p>
      ) : null}
    </div>
  );
}
