import {
  Boxes,
  ChevronRight,
  CircleAlert,
  GlassWater,
  Martini,
  PackagePlus,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { logout } from "@/app/dashboard/actions";
import { getMembership, requireUser } from "@/data/auth";

export default async function DashboardPage() {
  const { supabase, userId, email } = await requireUser();
  const membership = await getMembership(userId);

  if (!membership) redirect("/onboarding");

  const [{ data: organization }, { data: locations }] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name")
      .eq("id", membership.organization_id)
      .single(),
    supabase
      .from("locations")
      .select("id, name, timezone")
      .eq("organization_id", membership.organization_id)
      .order("created_at")
      .limit(1),
  ]);

  if (!organization) throw new Error("Organization not found.");
  const location = locations?.[0];
  const navigation = [
    { name: "Overview", icon: Boxes, active: true, href: "/dashboard" },
    { name: "Service", icon: Martini, href: "#" },
    { name: "Inventory", icon: PackagePlus, href: "/inventory" },
  ];

  return (
    <main className="min-h-screen bg-[#f5f3ee] text-stone-950">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-amber-500 text-stone-950">
              <GlassWater size={20} />
            </span>
            <div>
              <p className="font-semibold leading-tight">{organization.name}</p>
              <p className="text-xs text-stone-500">
                {location?.name ?? "No location"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-stone-500 sm:inline">{email}</span>
            <form action={logout}>
              <button className="rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium hover:bg-stone-50" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[210px_1fr]">
        <nav className="space-y-1">
          {navigation.map(({ name, icon: Icon, active, href }) => (
            <Link className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${active ? "bg-stone-950 text-white" : "text-stone-500 hover:bg-white hover:text-stone-900"}`} href={href} key={name}>
              <Icon size={18} />
              {name}
            </Link>
          ))}
        </nav>

        <section>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-medium text-amber-700">Operations</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.035em]">Good to see you.</h1>
              <p className="mt-2 text-stone-500">Your workspace is ready. Start by adding ingredients and branded products.</p>
            </div>
            <span className="w-fit rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700">Local database connected</span>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["Inventory products", "0", "Add your first product"],
              ["Generic ingredients", "0", "Create recipe building blocks"],
              ["Low stock", "0", "Reorder alerts appear here"],
            ].map(([label, value, detail]) => (
              <article className="rounded-2xl border border-stone-200 bg-white p-6" key={label}>
                <p className="text-sm text-stone-500">{label}</p>
                <p className="mt-3 text-4xl font-semibold tracking-tight">{value}</p>
                <p className="mt-3 text-sm text-stone-400">{detail}</p>
              </article>
            ))}
          </div>

          <article className="mt-6 overflow-hidden rounded-2xl border border-stone-200 bg-white">
            <div className="flex items-center gap-3 border-b border-stone-100 px-6 py-5">
              <CircleAlert className="text-amber-600" size={20} />
              <div>
                <h2 className="font-semibold">Finish inventory setup</h2>
                <p className="text-sm text-stone-500">Add generic ingredients first, then connect exact brands.</p>
              </div>
            </div>
            <Link className="flex w-full items-center justify-between px-6 py-5 text-left hover:bg-stone-50" href="/inventory">
              <span>
                <span className="block text-sm font-semibold">Create Vodka</span>
                <span className="mt-1 block text-sm text-stone-500">Then add Smirnoff, Grey Goose, Tito&apos;s, or other stocked brands.</span>
              </span>
              <ChevronRight className="text-stone-400" size={20} />
            </Link>
          </article>
        </section>
      </div>
    </main>
  );
}
