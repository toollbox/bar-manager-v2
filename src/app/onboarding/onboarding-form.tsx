"use client";

import { useActionState, useState } from "react";

import { createOrganization } from "@/app/onboarding/actions";
import type { OrganizationFormState } from "@/domain/auth";

const initialState: OrganizationFormState = {};

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(
    createOrganization,
    initialState,
  );
  const [timezone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  );

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <input name="timezone" type="hidden" value={timezone} />

      <div>
        <label
          className="text-sm font-medium text-foreground"
          htmlFor="organizationName"
        >
          Business name
        </label>
        <input
          autoFocus
          className="mt-2 w-full rounded-xl border border-border px-4 py-3 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
          id="organizationName"
          maxLength={120}
          name="organizationName"
          placeholder="Northstar Hospitality"
          required
        />
        {state.errors?.organizationName ? (
          <p className="mt-1.5 text-sm text-danger">
            Enter at least 2 characters.
          </p>
        ) : null}
      </div>

      <div>
        <label
          className="text-sm font-medium text-foreground"
          htmlFor="locationName"
        >
          First location
        </label>
        <input
          className="mt-2 w-full rounded-xl border border-border px-4 py-3 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
          id="locationName"
          maxLength={120}
          name="locationName"
          placeholder="Downtown Bar"
          required
        />
        {state.errors?.locationName ? (
          <p className="mt-1.5 text-sm text-danger">
            Enter at least 2 characters.
          </p>
        ) : null}
      </div>

      <div className="rounded-xl border border-border bg-surface-muted px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Timezone
        </p>
        <p className="mt-1 text-sm text-secondary">{timezone}</p>
      </div>

      {state.message ? (
        <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {state.message}
        </p>
      ) : null}

      <button
        className="w-full rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary-hover disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Creating workspace…" : "Create workspace"}
      </button>
    </form>
  );
}
