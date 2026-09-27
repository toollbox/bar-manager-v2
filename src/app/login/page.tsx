import { GlassWater } from "lucide-react";
import { redirect } from "next/navigation";

import { AuthForm } from "@/app/login/auth-form";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims.sub) redirect("/");

  return (
    <main className="grid min-h-screen bg-[#f4f0e8] lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-stone-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(217,119,6,0.25),transparent_36%),radial-gradient(circle_at_80%_80%,rgba(120,53,15,0.18),transparent_42%)]" />
        <div className="relative flex items-center gap-3 text-sm font-semibold tracking-wide">
          <span className="grid size-10 place-items-center rounded-xl bg-amber-500 text-stone-950">
            <GlassWater size={20} />
          </span>
          BAR MANAGER
        </div>
        <div className="relative max-w-xl">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.22em] text-amber-400">
            Built for the shift
          </p>
          <h1 className="text-5xl font-semibold leading-[1.08] tracking-[-0.04em]">
            Know what you have. Know what you can pour.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-stone-400">
            Branded inventory, flexible recipes, and purchasing intelligence in
            one operational workspace.
          </p>
        </div>
        <p className="relative text-sm text-stone-500">
          Local development environment
        </p>
      </section>

      <section className="flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-md rounded-3xl border border-stone-200/80 bg-white p-7 shadow-[0_24px_80px_rgba(41,37,36,0.10)] sm:p-10">
          <div className="mb-8 lg:hidden">
            <span className="inline-flex items-center gap-2 text-sm font-bold tracking-wide text-stone-900">
              <GlassWater className="text-amber-600" size={20} /> BAR MANAGER
            </span>
          </div>
          <h2 className="text-3xl font-semibold tracking-[-0.035em] text-stone-950">
            Welcome
          </h2>
          <p className="mb-8 mt-2 text-stone-500">
            Sign in or create the owner account for your bar.
          </p>
          <AuthForm />
        </div>
      </section>
    </main>
  );
}
