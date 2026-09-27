import { Boxes, ChevronRight, CircleAlert, GlassWater, Martini, PackagePlus, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { logout } from "@/app/dashboard/actions";
import { getMembership, requireUser } from "@/data/auth";

export default async function DashboardPage() {
  const { supabase, userId, email } = await requireUser();
  const membership = await getMembership(userId);
  if (!membership) redirect("/onboarding");
  const [{ data: organization }, { data: locations }] = await Promise.all([
    supabase.from("organizations").select("id, name").eq("id", membership.organization_id).single(),
    supabase.from("locations").select("id, name, timezone").eq("organization_id", membership.organization_id).order("created_at").limit(1),
  ]);
  if (!organization) throw new Error("Organization not found.");
  const location = locations?.[0];
  if (!location) throw new Error("Location not found.");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [productsResult, ingredientsResult, cocktailsResult, balancesResult, settingsResult, productionResult] = await Promise.all([
    supabase.from("inventory_products").select("id, brand, name").eq("organization_id", membership.organization_id).eq("is_active", true),
    supabase.from("ingredients").select("id").eq("organization_id", membership.organization_id).eq("is_active", true),
    supabase.from("cocktails").select("id").eq("organization_id", membership.organization_id).eq("is_active", true),
    supabase.from("inventory_balances").select("inventory_product_id, quantity").eq("location_id", location.id),
    supabase.from("location_products").select("inventory_product_id, reorder_point").eq("location_id", location.id),
    supabase.from("cocktail_productions").select("id, quantity").eq("location_id", location.id).gte("created_at", today.toISOString()),
  ]);
  const products = productsResult.data ?? [];
  const balances = new Map((balancesResult.data ?? []).map((item) => [item.inventory_product_id, Number(item.quantity)]));
  const productMap = new Map(products.map((item) => [item.id, item]));
  const lowStock = (settingsResult.data ?? []).filter((item) => Number(item.reorder_point) > 0 && (balances.get(item.inventory_product_id) ?? 0) <= Number(item.reorder_point));
  const drinksToday = (productionResult.data ?? []).reduce((sum, item) => sum + item.quantity, 0);
  const navigation = [
    { name: "Overview", icon: Boxes, active: true, href: "/dashboard" },
    { name: "Service", icon: Martini, href: "/service" },
    { name: "Cocktails", icon: GlassWater, href: "/cocktails" },
    { name: "Inventory", icon: PackagePlus, href: "/inventory" },
    { name: "Purchasing", icon: ShoppingCart, href: "/purchasing" },
  ];
  const metrics = [
    ["Inventory products", products.length, `${ingredientsResult.data?.length ?? 0} generic ingredients`],
    ["Cocktails", cocktailsResult.data?.length ?? 0, "Active recipes"],
    ["Low stock", lowStock.length, lowStock.length ? "Needs purchasing attention" : "Configured levels healthy"],
    ["Drinks today", drinksToday, `${productionResult.data?.length ?? 0} production events`],
  ] as const;

  return <main className="min-h-screen bg-[#f5f3ee] text-stone-950">
    <header className="border-b border-stone-200 bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-amber-500"><GlassWater size={20} /></span><div><p className="font-semibold leading-tight">{organization.name}</p><p className="text-xs text-stone-500">{location.name}</p></div></div><div className="flex items-center gap-4"><span className="hidden text-sm text-stone-500 sm:inline">{email}</span><form action={logout}><button className="rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium hover:bg-stone-50" type="submit">Sign out</button></form></div></div></header>
    <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[210px_1fr]"><nav className="space-y-1">{navigation.map(({ name, icon: Icon, active, href }) => <Link className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${active ? "bg-stone-950 text-white" : "text-stone-500 hover:bg-white hover:text-stone-900"}`} href={href} key={name}><Icon size={18} />{name}</Link>)}</nav>
      <section><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-medium text-amber-700">Operations</p><h1 className="mt-1 text-3xl font-semibold tracking-[-0.035em]">Today at {location.name}</h1><p className="mt-2 text-stone-500">Live stock, menu, and production activity.</p></div><span className="w-fit rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700">Local database connected</span></div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label, value, detail]) => <article className="rounded-2xl border border-stone-200 bg-white p-5" key={label}><p className="text-sm text-stone-500">{label}</p><p className="mt-3 text-4xl font-semibold tracking-tight">{value}</p><p className="mt-3 text-xs text-stone-400">{detail}</p></article>)}</div>
      {lowStock.length > 0 ? <article className="mt-6 overflow-hidden rounded-2xl border border-amber-200 bg-white"><div className="flex items-center justify-between border-b border-amber-100 px-6 py-5"><div className="flex items-center gap-3"><CircleAlert className="text-amber-600" size={20} /><div><h2 className="font-semibold">Low-stock attention</h2><p className="text-sm text-stone-500">{lowStock.length} product{lowStock.length === 1 ? "" : "s"} at or below reorder level.</p></div></div><Link className="text-sm font-semibold text-amber-700" href="/purchasing">Open plan →</Link></div>{lowStock.slice(0, 5).map((item) => { const product = productMap.get(item.inventory_product_id); return <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4 last:border-0" key={item.inventory_product_id}><span className="text-sm font-semibold">{product ? `${product.brand} ${product.name}` : "Unknown product"}</span><span className="text-xs text-stone-500">{(balances.get(item.inventory_product_id) ?? 0).toLocaleString()} remaining</span></div>; })}</article> : <article className="mt-6 flex items-center justify-between rounded-2xl border border-stone-200 bg-white px-6 py-5"><div><h2 className="font-semibold">Inventory levels are healthy</h2><p className="mt-1 text-sm text-stone-500">No configured products need reordering.</p></div><Link className="text-sm font-semibold text-stone-600" href="/inventory">Review inventory →</Link></article>}
      <div className="mt-6 grid gap-4 md:grid-cols-2"><Link className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white p-6 hover:border-amber-300" href="/service"><span><span className="block font-semibold">Open service menu</span><span className="mt-1 block text-sm text-stone-500">Make drinks and record exact products poured.</span></span><ChevronRight className="text-stone-400" /></Link><Link className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white p-6 hover:border-amber-300" href="/purchasing"><span><span className="block font-semibold">Review purchase plan</span><span className="mt-1 block text-sm text-stone-500">Replenish products to target stock.</span></span><ChevronRight className="text-stone-400" /></Link></div>
      </section></div>
  </main>;
}
