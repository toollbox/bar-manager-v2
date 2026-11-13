import { Building2, MapPin, PackageCheck } from "lucide-react";
import { redirect } from "next/navigation";

import { OnboardingForm } from "@/app/onboarding/onboarding-form";
import { AcceptInvitationForm } from "@/app/settings/settings-forms";
import { getMembership, requireUser } from "@/data/auth";

export default async function OnboardingPage() {
  const { userId } = await requireUser();
  const membership = await getMembership(userId);

  if (membership) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-background px-6 py-12 sm:py-20">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <section className="auth-hero rounded-3xl bg-hero p-8 text-hero-foreground sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-hero-accent">
            One last step
          </p>
          <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-[-0.04em]">
            Set up your first bar workspace.
          </h1>
          <p className="mt-4 leading-7 text-hero-muted">
            Your account becomes the owner. You can invite managers and
            bartenders after setup.
          </p>
          <div className="mt-10 space-y-5 text-sm text-hero-muted">
            <div className="flex gap-3">
              <Building2 className="mt-0.5 text-hero-accent" size={19} />
              One organization for your business
            </div>
            <div className="flex gap-3">
              <MapPin className="mt-0.5 text-hero-accent" size={19} />
              Location-aware inventory and service
            </div>
            <div className="flex gap-3">
              <PackageCheck className="mt-0.5 text-hero-accent" size={19} />
              Exact branded product tracking
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-surface p-8 shadow-[0_24px_80px_rgba(41,37,36,0.08)] sm:p-10">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Workspace details
          </h2>
          <p className="mt-2 text-muted-foreground">
            Both names can be changed later in settings.
          </p>
          <OnboardingForm />
          <div className="mt-8 border-t border-border pt-6">
            <h3 className="mb-3 font-semibold">Already invited to a bar?</h3>
            <AcceptInvitationForm />
          </div>
        </section>
      </div>
    </main>
  );
}
