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
          className="text-sm font-medium text-stone-800"
          htmlFor="organizationName"
        >
          Business name
        </label>
        <input
          autoFocus
          className="mt-2 w-full rounded-xl border border-stone-200 px-4 py-3 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
          id="organizationName"
          maxLength={120}
          name="organizationName"
          placeholder="Northstar Hospitality"
          required
        />
        {state.errors?.organizationName ? (
          <p className="mt-1.5 text-sm text-rose-600">
            Enter at least 2 characters.
          </p>
        ) : null}
      </div>

      <div>
        <label
          className="text-sm font-medium text-stone-800"
          htmlFor="locationName"
        >
          First location
        </label>
        <input
          className="mt-2 w-full rounded-xl border border-stone-200 px-4 py-3 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
          id="locationName"
          maxLength={120}
          name="locationName"
          placeholder="Downtown Bar"
          required
        />
        {state.errors?.locationName ? (
          <p className="mt-1.5 text-sm text-rose-600">
            Enter at least 2 characters.
          </p>
        ) : null}
      </div>

      <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
          Timezone
        </p>
        <p className="mt-1 text-sm text-stone-700">{timezone}</p>
      </div>

      {state.message ? (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.message}
        </p>
      ) : null}

      <button
        className="w-full rounded-xl bg-stone-950 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Creating workspace…" : "Create workspace"}
      </button>
    </form>
  );
}
