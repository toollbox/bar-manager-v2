import { ArrowLeft, CircleCheck, PackageOpen, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ReceiveForm } from "@/app/purchasing/receive-form";
import { getMembership, requireUser } from "@/data/auth";
import { calculateReorder } from "@/domain/purchasing";

export default async function PurchasingPage() {
  const { supabase, userId } = await requireUser();
  const membership = await getMembership(userId);
  if (!membership) redirect("/onboarding");
  const { data: locations } = await supabase.from("locations").select("id, name").eq("organization_id", membership.organization_id).order("created_at").limit(1);
  const location = locations?.[0];
  if (!location) throw new Error("No inventory location was found.");
  const [productsResult, ingredientsResult, balancesResult, settingsResult] = await Promise.all([
    supabase.from("inventory_products").select("id, ingredient_id, brand, name, bottle_size, default_cost").eq("organization_id", membership.organization_id).eq("is_active", true),
    supabase.from("ingredients").select("id, name, base_unit").eq("organization_id", membership.organization_id),
    supabase.from("inventory_balances").select("inventory_product_id, quantity").eq("location_id", location.id),
    supabase.from("location_products").select("inventory_product_id, reorder_point, target_stock").eq("location_id", location.id),
  ]);
  const ingredients = new Map((ingredientsResult.data ?? []).map((item) => [item.id, item]));
  const balances = new Map((balancesResult.data ?? []).map((item) => [item.inventory_product_id, Number(item.quantity)]));
  const settings = new Map((settingsResult.data ?? []).map((item) => [item.inventory_product_id, item]));
  const rows = (productsResult.data ?? []).map((product) => {
    const locationSettings = settings.get(product.id);
    const quantity = balances.get(product.id) ?? 0;
    return { ...product, quantity, ingredient: ingredients.get(product.ingredient_id), ...calculateReorder({ quantity, reorderPoint: Number(locationSettings?.reorder_point ?? 0), targetStock: Number(locationSettings?.target_stock ?? 0), bottleSize: product.bottle_size ? Number(product.bottle_size) : null, bottleCost: product.default_cost ? Number(product.default_cost) : null }) };
  });
  const lowRows = rows.filter((row) => row.isLow).sort((a, b) => a.quantity - b.quantity);
  const estimatedTotal = lowRows.reduce((total, row) => total + (row.estimatedCost ?? 0), 0);
  const canReceive = membership.role === "owner" || membership.role === "manager";

  return <main className="min-h-screen bg-[#f5f3ee] text-stone-950"><header className="border-b border-stone-200 bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4"><div className="flex items-center gap-3"><Link className="grid size-10 place-items-center rounded-xl border border-stone-200 hover:bg-stone-50" href="/dashboard"><ArrowLeft size={18} /></Link><div><p className="font-semibold">Purchasing</p><p className="text-xs text-stone-500">{location.name}</p></div></div><span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">{lowRows.length} to reorder</span></div></header>
    <div className="mx-auto max-w-7xl px-6 py-8"><p className="text-sm font-medium text-amber-700">Stock planning</p><h1 className="mt-1 text-3xl font-semibold tracking-[-0.035em]">Reorder recommendations</h1><p className="mt-2 max-w-2xl text-stone-500">Suggestions refill low products to their target level and round up to whole bottles when package size is known.</p>
    <div className="mt-6 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-stone-200 bg-white p-5"><p className="text-sm text-stone-500">Products to order</p><p className="mt-2 text-3xl font-semibold">{lowRows.length}</p></div><div className="rounded-2xl border border-stone-200 bg-white p-5"><p className="text-sm text-stone-500">Estimated cost</p><p className="mt-2 text-3xl font-semibold">${estimatedTotal.toFixed(2)}</p></div><div className="rounded-2xl border border-stone-200 bg-white p-5"><p className="text-sm text-stone-500">Location</p><p className="mt-2 text-lg font-semibold">{location.name}</p></div></div>
    {lowRows.length === 0 ? <div className="mt-6 rounded-2xl border border-stone-200 bg-white px-6 py-16 text-center"><CircleCheck className="mx-auto text-emerald-600" size={32} /><h2 className="mt-4 font-semibold">Stock levels look healthy</h2><p className="mt-1 text-sm text-stone-500">No products are at or below their reorder point.</p></div> : <section className="mt-6 grid gap-4 md:grid-cols-2">{lowRows.map((row) => <article className="rounded-2xl border border-stone-200 bg-white p-5" key={row.id}><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-stone-400">{row.ingredient?.name}</p><h2 className="mt-1 font-semibold">{row.brand} {row.name}</h2></div><ShoppingCart className="text-amber-600" size={20} /></div><div className="mt-4 grid grid-cols-3 gap-2 text-sm"><div className="rounded-xl bg-rose-50 p-3"><p className="text-xs text-rose-600">On hand</p><p className="mt-1 font-semibold">{row.quantity.toLocaleString()} {row.ingredient?.base_unit}</p></div><div className="rounded-xl bg-stone-50 p-3"><p className="text-xs text-stone-500">Order</p><p className="mt-1 font-semibold">{row.suggestedPackages !== null ? `${row.suggestedPackages} bottle${row.suggestedPackages === 1 ? "" : "s"}` : `${row.suggestedQuantity.toLocaleString()} ${row.ingredient?.base_unit}`}</p></div><div className="rounded-xl bg-stone-50 p-3"><p className="text-xs text-stone-500">Estimate</p><p className="mt-1 font-semibold">{row.estimatedCost === null ? "—" : `$${row.estimatedCost.toFixed(2)}`}</p></div></div>{canReceive ? <ReceiveForm locationId={location.id} productId={row.id} suggestedQuantity={row.suggestedPackages && row.bottle_size ? row.suggestedPackages * Number(row.bottle_size) : row.suggestedQuantity} unit={row.ingredient?.base_unit ?? "each"} /> : <p className="mt-4 text-xs text-stone-500">A manager can record delivery receipt.</p>}</article>)}</section>}
    <div className="mt-6 flex items-center gap-2 text-xs text-stone-400"><PackageOpen size={14} />Add bottle size and cost in inventory for package and cost estimates.</div></div></main>;
}
