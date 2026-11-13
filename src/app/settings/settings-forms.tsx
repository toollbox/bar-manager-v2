"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  acceptInvitation,
  addLocation,
  changeMember,
  createInvitation,
  type SettingsState,
} from "./actions";

const input = "rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm";
const button =
  "rounded-xl bg-stone-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50";
function Feedback({ state }: { state: SettingsState }) {
  return state.message ? (
    <div
      aria-live="polite"
      className={`mt-3 text-sm ${state.error ? "text-rose-700" : "text-emerald-700"}`}
    >
      <p>{state.message}</p>
      {state.code ? (
        <code className="mt-2 block select-all break-all rounded-lg bg-amber-50 p-3 text-stone-900">
          {state.code}
        </code>
      ) : null}
    </div>
  ) : null;
}
export function InvitationForm() {
  const [state, action, pending] = useActionState(
    createInvitation,
    {} as SettingsState,
  );
  return (
    <form action={action}>
      <div className="flex flex-wrap gap-2">
        <input
          aria-label="Recipient email"
          className={input}
          name="email"
          placeholder="teammate@example.com"
          required
          type="email"
        />
        <select aria-label="Invitation role" className={input} name="role">
          <option value="bartender">Bartender</option>
          <option value="manager">Manager</option>
        </select>
        <button className={button} disabled={pending}>
          Create invitation
        </button>
      </div>
      <Feedback state={state} />
    </form>
  );
}
export function AcceptInvitationForm() {
  const [state, action, pending] = useActionState(
    acceptInvitation,
    {} as SettingsState,
  );
  return (
    <form action={action}>
      <div className="flex flex-wrap gap-2">
        <input
          aria-label="Invitation code"
          className={`${input} min-w-64 flex-1`}
          name="code"
          placeholder="Invitation code"
          required
        />
        <button className={button} disabled={pending}>
          Join workspace
        </button>
      </div>
      <Feedback state={state} />
      {state.message && !state.error ? (
        <Link className="mt-2 block text-sm underline" href="/dashboard">
          Open dashboard
        </Link>
      ) : null}
    </form>
  );
}
export function LocationForm() {
  const [state, action, pending] = useActionState(
    addLocation,
    {} as SettingsState,
  );
  return (
    <form action={action}>
      <div className="flex flex-wrap gap-2">
        <input
          aria-label="Location name"
          className={input}
          name="name"
          placeholder="Uptown Bar"
          required
        />
        <input
          aria-label="Location timezone"
          className={input}
          defaultValue="America/Chicago"
          name="timezone"
          placeholder="America/Chicago"
          required
        />
        <button className={button} disabled={pending}>
          Add location
        </button>
      </div>
      <Feedback state={state} />
    </form>
  );
}
export function MemberForm({ userId, role }: { userId: string; role: string }) {
  const [state, action, pending] = useActionState(
    changeMember,
    {} as SettingsState,
  );
  return (
    <form action={action}>
      <input name="userId" type="hidden" value={userId} />
      <div className="flex gap-2">
        <select
          aria-label="Member role"
          className={input}
          defaultValue={role}
          name="role"
        >
          <option value="owner">Owner</option>
          <option value="manager">Manager</option>
          <option value="bartender">Bartender</option>
          <option value="remove">Remove member</option>
        </select>
        <button className={button} disabled={pending}>
          Save role
        </button>
      </div>
      <Feedback state={state} />
    </form>
  );
}
