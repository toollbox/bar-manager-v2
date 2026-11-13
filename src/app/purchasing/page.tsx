import {
  ArrowLeft,
  CircleCheck,
  PackageOpen,
  ShoppingCart,
} from "lucide-react";
import Link from "next/link";

import { ReceiveForm } from "@/app/purchasing/receive-form";
import { requireWorkspace } from "@/data/workspace";
import { WorkspaceNav } from "@/components/workspace-nav";
import { calculateReorder } from "@/domain/purchasing";
import { formatStockQuantity } from "@/domain/units";

export default async function PurchasingPage() {
  const { supabase, membership, location } = await requireWorkspace();

  const [productsResult, ingredientsResult, balancesResult, settingsResult] =
    await Promise.all([
      supabase
        .from("inventory_products")
        .select("id, ingredient_id, brand, name, bottle_size, stock_unit")
        .eq("organization_id", membership.organization_id)
        .eq("is_active", true),
      supabase
        .from("ingredients")
        .select("id, name, base_unit")
        .eq("organization_id", membership.organization_id),
      supabase
        .from("inventory_balances")
        .select("inventory_product_id, quantity")
        .eq("location_id", location.id),
      supabase
        .from("location_products")
        .select("inventory_product_id, reorder_point, target_stock")
        .eq("location_id", location.id),
    ]);
  if (
    [productsResult, ingredientsResult, balancesResult, settingsResult].some(
      (result) => result.error,
    )
  )
    throw new Error("Unable to load purchasing data. Please try again.");
  const ingredients = new Map(
    (ingredientsResult.data ?? []).map((item) => [item.id, item]),
  );
  const balances = new Map(
    (balancesResult.data ?? []).map((item) => [
      item.inventory_product_id,
      Number(item.quantity),
    ]),
  );
  const settings = new Map(
    (settingsResult.data ?? []).map((item) => [
      item.inventory_product_id,
      item,
    ]),
  );
  const rows = (productsResult.data ?? []).map((product) => {
    const locationSettings = settings.get(product.id);
    const quantity = balances.get(product.id) ?? 0;
    return {
      ...product,
      quantity,
      ingredient: ingredients.get(product.ingredient_id),
      ...calculateReorder({
        quantity,
        reorderPoint: Number(locationSettings?.reorder_point ?? 0),
        targetStock: Number(locationSettings?.target_stock ?? 0),
        bottleSize:
          product.bottle_size === null ? null : Number(product.bottle_size),
        bottleCost: null,
      }),
    };
  });
  const lowRows = rows
    .filter((row) => row.isLow)
    .sort((a, b) => a.quantity - b.quantity);
  const canReceive =
    membership.role === "owner" || membership.role === "manager";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <WorkspaceNav />
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link
              className="grid size-10 place-items-center rounded-xl border border-border hover:bg-surface-muted"
              href="/dashboard"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <p className="font-semibold">Purchasing</p>
              <p className="text-xs text-muted-foreground">{location.name}</p>
            </div>
          </div>
          <span className="rounded-full bg-warning-soft px-3 py-1.5 text-xs font-semibold text-warning">
            {lowRows.length} to reorder
          </span>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-6 py-8">
        <p className="text-sm font-medium text-accent-strong">Stock planning</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-[-0.035em]">
          Reorder recommendations
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Suggestions refill low products to their target level and round up to
          whole bottles when package size is known.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-sm text-muted-foreground">Products to order</p>
            <p className="mt-2 text-3xl font-semibold">{lowRows.length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-sm text-muted-foreground">Location</p>
            <p className="mt-2 text-lg font-semibold">{location.name}</p>
          </div>
        </div>
        {lowRows.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-border bg-surface px-6 py-16 text-center">
            <CircleCheck className="mx-auto text-success" size={32} />
            <h2 className="mt-4 font-semibold">Stock levels look healthy</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              No products are at or below their reorder point.
            </p>
          </div>
        ) : (
          <section className="mt-6 grid gap-4 md:grid-cols-2">
            {lowRows.map((row) => (
              <article
                className="rounded-2xl border border-border bg-surface p-5"
                key={row.id}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {row.ingredient?.name}
                    </p>
                    <h2 className="mt-1 font-semibold">
                      {row.brand} {row.name}
                    </h2>
                  </div>
                  <ShoppingCart className="text-accent-strong" size={20} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl bg-danger-soft p-3">
                    <p className="text-xs text-danger">On hand</p>
                    <p className="mt-1 font-semibold">
                      {formatStockQuantity(
                        row.quantity,
                        row.ingredient?.base_unit ?? "each",
                        row.stock_unit,
                      )}
                    </p>
                  </div>
                  <div className="rounded-xl bg-surface-muted p-3">
                    <p className="text-xs text-muted-foreground">Order</p>
                    <p className="mt-1 font-semibold">
                      {row.suggestedPackages !== null
                        ? `${row.suggestedPackages} bottle${row.suggestedPackages === 1 ? "" : "s"}`
                        : formatStockQuantity(
                            row.suggestedQuantity,
                            row.ingredient?.base_unit ?? "each",
                            row.stock_unit,
                          )}
                    </p>
                    {row.suggestedPackages !== null ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatStockQuantity(
                          row.suggestedPackages * Number(row.bottle_size),
                          row.ingredient?.base_unit ?? "each",
                          row.stock_unit,
                        )}
                      </p>
                    ) : null}
                  </div>
                </div>
                {canReceive ? (
                  <ReceiveForm
                    locationId={location.id}
                    productId={row.id}
                    suggestedQuantity={
                      row.suggestedPackages && row.bottle_size
                        ? row.suggestedPackages * Number(row.bottle_size)
                        : row.suggestedQuantity
                    }
                    unit={row.ingredient?.base_unit ?? "each"}
                    stockUnit={row.stock_unit}
                  />
                ) : (
                  <p className="mt-4 text-xs text-muted-foreground">
                    A manager can record delivery receipt.
                  </p>
                )}
              </article>
            ))}
          </section>
        )}
        <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
          <PackageOpen size={14} />
          Add bottle size in inventory for package estimates.
        </div>
      </div>
    </main>
  );
}
