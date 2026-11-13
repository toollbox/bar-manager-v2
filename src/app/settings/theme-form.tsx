"use client";

import { Check, Palette } from "lucide-react";
import { useActionState, useState } from "react";
import { themes, type ThemeId } from "@/domain/themes";
import { saveTheme, type SettingsState } from "./actions";

export function ThemeForm({ currentTheme }: { currentTheme: ThemeId }) {
  const [selected, setSelected] = useState<ThemeId>(currentTheme);
  const [state, action, pending] = useActionState(
    saveTheme,
    {} as SettingsState,
  );
  return (
    <form action={action} onReset={(event) => event.preventDefault()}>
      <fieldset disabled={pending}>
        <legend className="mb-4 text-sm font-medium text-secondary">
          Choose your theme
        </legend>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {themes.map((theme) => (
            <label
              key={theme.id}
              className={`relative cursor-pointer overflow-hidden rounded-2xl border p-3 transition focus-within:ring-2 focus-within:ring-primary ${selected === theme.id ? "border-primary ring-2 ring-primary" : "border-border hover:border-border-strong"}`}
            >
              <div
                aria-hidden="true"
                className="mb-3 overflow-hidden rounded-xl border p-3"
                style={{
                  backgroundColor: theme.variables["--background"],
                  borderColor: theme.variables["--border"],
                }}
              >
                <div className="mb-3 flex items-center gap-1">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: theme.variables["--primary"] }}
                  />
                  <span
                    className="h-1.5 w-12 rounded-full"
                    style={{
                      backgroundColor: theme.variables["--muted-foreground"],
                    }}
                  />
                </div>
                <div
                  className="rounded-lg border p-3"
                  style={{
                    backgroundColor: theme.variables["--surface"],
                    borderColor: theme.variables["--border"],
                    borderRadius: theme.variables["--corner-radius"],
                  }}
                >
                  <div
                    className="mb-2 h-2 w-3/4 rounded-full"
                    style={{ backgroundColor: theme.variables["--foreground"] }}
                  />
                  <div
                    className="mb-3 h-1.5 w-1/2 rounded-full"
                    style={{
                      backgroundColor: theme.variables["--muted-foreground"],
                    }}
                  />
                  <div
                    className="h-6 w-1/2 rounded-md"
                    style={{ backgroundColor: theme.variables["--primary"] }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  aria-label={theme.name}
                  className="size-4 accent-primary"
                  type="radio"
                  name="theme"
                  value={theme.id}
                  checked={selected === theme.id}
                  onChange={() => setSelected(theme.id)}
                />
                <span className="font-semibold">{theme.name}</span>
                {currentTheme === theme.id ? (
                  <Check
                    aria-label="Current theme"
                    className="ml-auto text-success"
                    size={16}
                  />
                ) : null}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {theme.description}
              </p>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          disabled={pending || selected === currentTheme}
        >
          <Palette size={16} />
          {pending ? "Saving…" : "Save theme"}
        </button>
        {state.message ? (
          <p
            aria-live="polite"
            className={`text-sm ${state.error ? "text-danger" : "text-success"}`}
          >
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
