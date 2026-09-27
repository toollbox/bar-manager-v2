import {
  ArrowLeft,
  Boxes,
  CircleAlert,
  PackageCheck,
  Tags,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  IngredientForm,
  ProductForm,
} from "@/app/inventory/inventory-forms";
import { getMembership, requireUser } from "@/data/auth";

export default async function InventoryPage() {
  const { supabase, userId } = await requireUser();
  const membership = await getMembership(userId);

  if (!membership) redirect("/onboarding");

  const { data: locations } = await supabase
    .from("locations")
    .select("id, name")
    .eq("organization_id", membership.organization_id)
    .order("created_at")
    .limit(1);
  const location = locations?.[0];

  if (!location) throw new Error("No inventory location was found.");

  const [ingredientsResult, productsResult, balancesResult, settingsResult] =
    await Promise.all([
      supabase
        .from("ingredients")
        .select("id, name, category, base_unit")
        .eq("organization_id", membership.organization_id)
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("inventory_products")
        .select("id, ingredient_id, brand, name, variant, bottle_size, default_cost")
        .eq("organization_id", membership.organization_id)
        .eq("is_active", true)
        .order("brand"),
      supabase
        .from("inventory_balances")
        .select("inventory_product_id, quantity")
        .eq("location_id", location.id),
      supabase
        .from("location_products")
        .select("inventory_product_id, reorder_point, target_stock")
        .eq("location_id", location.id),
    ]);

  const ingredients = ingredientsResult.data ?? [];
  const products = productsResult.data ?? [];
  const balances = new Map(
    (balancesResult.data ?? []).map((row) => [row.inventory_product_id, row.quantity]),
  );
  const settings = new Map(
    (settingsResult.data ?? []).map((row) => [row.inventory_product_id, row]),
  );
  const ingredientMap = new Map(ingredients.map((item) => [item.id, item]));
  const rows = products.map((product) => {
    const quantity = balances.get(product.id) ?? 0;
    const productSettings = settings.get(product.id);
    return {
      ...product,
      quantity,
      reorderPoint: productSettings?.reorder_point ?? 0,
      targetStock: productSettings?.target_stock ?? 0,
      ingredient: ingredientMap.get(product.ingredient_id),
      lowStock:
        (productSettings?.reorder_point ?? 0) > 0 &&
        quantity <= (productSettings?.reorder_point ?? 0),
    };
  });
  const lowStockCount = rows.filter((row) => row.lowStock).length;

  return (
    <main className="min-h-screen bg-[#f5f3ee] text-stone-950">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link className="grid size-10 place-items-center rounded-xl border border-stone-200 hover:bg-stone-50" href="/dashboard">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <p className="font-semibold">Inventory</p>
              <p className="text-xs text-stone-500">{location.name}</p>
            </div>
          </div>
          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-stone-500 ring-1 ring-stone-200">
            {membership.role}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-amber-700">Stock room</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-[-0.035em]">Branded inventory</h1>
            <p className="mt-2 max-w-2xl text-stone-500">
              Recipes use generic ingredients. Stock and consumption use the exact brand selected by the bartender.
            </p>
          </div>
          <div className="flex gap-2 text-sm">
            <span className="rounded-xl bg-white px-3 py-2 ring-1 ring-stone-200">{ingredients.length} ingredients</span>
            <span className="rounded-xl bg-white px-3 py-2 ring-1 ring-stone-200">{products.length} products</span>
          </div>
        </div>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-stone-200 bg-white p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-stone-100"><Boxes size={19} /></span>
              <div>
                <h2 className="font-semibold">1. Generic ingredient</h2>
                <p className="text-sm text-stone-500">Example: Vodka, Gin, Lime Juice</p>
              </div>
            </div>
            <IngredientForm />
          </article>

          <article className="rounded-2xl border border-stone-200 bg-white p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-amber-100 text-amber-800"><Tags size={19} /></span>
              <div>
                <h2 className="font-semibold">2. Branded product</h2>
                <p className="text-sm text-stone-500">Example: Smirnoff No. 21</p>
              </div>
            </div>
            <ProductForm ingredients={ingredients} locationId={location.id} />
          </article>
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl border border-stone-200 bg-white">
          <div className="flex items-center justify-between border-b border-stone-100 px-6 py-5">
            <div>
              <h2 className="font-semibold">Products at {location.name}</h2>
              <p className="mt-1 text-sm text-stone-500">Opening stock and future movements update these balances.</p>
            </div>
            {lowStockCount > 0 ? (
              <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800">
                <CircleAlert size={14} /> {lowStockCount} low
              </span>
            ) : null}
          </div>

          {rows.length === 0 ? (
            <div className="grid place-items-center px-6 py-16 text-center">
              <span className="grid size-12 place-items-center rounded-2xl bg-stone-100 text-stone-500"><PackageCheck size={22} /></span>
              <h3 className="mt-4 font-semibold">No branded products yet</h3>
              <p className="mt-1 max-w-md text-sm text-stone-500">Create a generic ingredient above, then add the specific bottle or product you stock.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-400">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Product</th>
                    <th className="px-4 py-3 font-semibold">Ingredient</th>
                    <th className="px-4 py-3 font-semibold">On hand</th>
                    <th className="px-4 py-3 font-semibold">Reorder at</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td className="px-6 py-4">
                        <p className="font-semibold">{row.brand} {row.name}</p>
                        <p className="mt-0.5 text-xs text-stone-400">{row.bottle_size ? `${row.bottle_size} ${row.ingredient?.base_unit}` : "Size not set"}</p>
                      </td>
                      <td className="px-4 py-4 text-stone-600">{row.ingredient?.name ?? "Unknown"}</td>
                      <td className="px-4 py-4 font-semibold">{row.quantity.toLocaleString()} {row.ingredient?.base_unit}</td>
                      <td className="px-4 py-4 text-stone-500">{row.reorderPoint.toLocaleString()} {row.ingredient?.base_unit}</td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.lowStock ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700"}`}>
                          {row.lowStock ? "Low stock" : "In stock"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
