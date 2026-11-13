"use client";

import { DatabaseZap } from "lucide-react";
import { useActionState } from "react";

import { loadStarterBar, type StarterBarState } from "@/app/dashboard/actions";

export function StarterBarCard() {
  const [state, action, pending] = useActionState(loadStarterBar, {} as StarterBarState);
  return <article className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-200 text-amber-900"><DatabaseZap size={19} /></span><div><h2 className="font-semibold">Starter bar data</h2><p className="mt-1 max-w-2xl text-sm text-stone-600">Load 14 common ingredients, 15 stocked products, and six recipes: Margarita, Moscow Mule, Old Fashioned, Mojito, Gin and Tonic, and Whiskey Sour.</p></div></div><form action={action}><button className="whitespace-nowrap rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-stone-950 hover:bg-amber-400 disabled:opacity-60" disabled={pending}>{pending ? "Loading…" : "Load starter bar"}</button></form></div>{state.message ? <p aria-live="polite" className={`mt-4 rounded-xl px-3 py-2.5 text-sm ${state.status === "success" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-700"}`}>{state.message}</p> : null}</article>;
}
