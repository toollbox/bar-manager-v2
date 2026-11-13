import { GlassWater } from "lucide-react";
import { redirect } from "next/navigation";

import { AuthForm } from "@/app/login/auth-form";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims.sub) redirect("/");

  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-hero p-12 text-hero-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="auth-hero absolute inset-0" />
        <div className="relative flex items-center gap-3 text-sm font-semibold tracking-wide">
          <span className="grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground">
            <GlassWater size={20} />
          </span>
          BAR MANAGER
        </div>
        <div className="relative max-w-xl">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.22em] text-hero-accent">
            Built for the shift
          </p>
          <h1 className="text-5xl font-semibold leading-[1.08] tracking-[-0.04em]">
            Know what you have. Know what you can pour.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-hero-muted">
            Branded inventory, flexible recipes, and purchasing intelligence in
            one operational workspace.
          </p>
        </div>
        <p className="relative text-sm text-hero-muted">
          Local development environment
        </p>
      </section>

      <section className="flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-md rounded-3xl border border-border/80 bg-surface p-7 shadow-[0_24px_80px_rgba(41,37,36,0.10)] sm:p-10">
          <div className="mb-8 lg:hidden">
            <span className="inline-flex items-center gap-2 text-sm font-bold tracking-wide text-foreground">
              <GlassWater className="text-accent-strong" size={20} /> BAR MANAGER
            </span>
          </div>
          <h2 className="text-3xl font-semibold tracking-[-0.035em] text-foreground">
            Welcome
          </h2>
          <p className="mb-8 mt-2 text-muted-foreground">
            Sign in or create the owner account for your bar.
          </p>
          <AuthForm />
        </div>
      </section>
    </main>
  );
}
