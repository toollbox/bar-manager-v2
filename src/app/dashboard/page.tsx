import {
  Boxes,
  ChevronRight,
  CircleAlert,
  GlassWater,
  Martini,
  PackagePlus,
  ShoppingCart,
} from "lucide-react";
import Link from "next/link";

import { logout } from "@/app/dashboard/actions";
import { StarterBarCard } from "@/app/dashboard/starter-bar-card";
import { requireWorkspace } from "@/data/workspace";
import { WorkspaceNav } from "@/components/workspace-nav";
import { formatStockQuantity } from "@/domain/units";

export default async function DashboardPage() {
  const { supabase, email, membership, location } = await requireWorkspace();
  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", membership.organization_id)
    .single();
  if (organizationError || !organization)
    throw new Error("Organization not found.");
  const [
    productsResult,
    ingredientsResult,
    cocktailsResult,
    balancesResult,
    settingsResult,
    productionResult,
  ] = await Promise.all([
    supabase
      .from("inventory_products")
      .select("id, brand, name, ingredient_id, stock_unit")
      .eq("organization_id", membership.organization_id)
      .eq("is_active", true),
    supabase
      .from("ingredients")
      .select("id, base_unit")
      .eq("organization_id", membership.organization_id)
      .eq("is_active", true),
    supabase
      .from("cocktails")
      .select("id")
      .eq("organization_id", membership.organization_id)
      .eq("is_active", true),
    supabase
      .from("inventory_balances")
      .select("inventory_product_id, quantity")
      .eq("location_id", location.id),
    supabase
      .from("location_products")
      .select("inventory_product_id, reorder_point")
      .eq("location_id", location.id),
    supabase.rpc("daily_production_totals", {
      target_location_id: location.id,
    }),
  ]);
  if (
    [
      productsResult,
      ingredientsResult,
      cocktailsResult,
      balancesResult,
      settingsResult,
      productionResult,
    ].some((result) => result.error)
  )
    throw new Error("Unable to load dashboard data. Please try again.");
  const products = productsResult.data ?? [];
  const balances = new Map(
    (balancesResult.data ?? []).map((item) => [
      item.inventory_product_id,
      Number(item.quantity),
    ]),
  );
  const productMap = new Map(products.map((item) => [item.id, item]));
  const ingredientMap = new Map(
    (ingredientsResult.data ?? []).map((item) => [item.id, item]),
  );
  const lowStock = (settingsResult.data ?? []).filter(
    (item) =>
      productMap.has(item.inventory_product_id) &&
      Number(item.reorder_point) > 0 &&
      (balances.get(item.inventory_product_id) ?? 0) <=
        Number(item.reorder_point),
  );
  const totals = productionResult.data as {
    drinks: number;
    events: number;
  } | null;
  const drinksToday = totals?.drinks ?? 0;
  const navigation = [
    { name: "Overview", icon: Boxes, active: true, href: "/dashboard" },
    { name: "Service", icon: Martini, href: "/service" },
    { name: "Cocktails", icon: GlassWater, href: "/cocktails" },
    { name: "Inventory", icon: PackagePlus, href: "/inventory" },
    { name: "Purchasing", icon: ShoppingCart, href: "/purchasing" },
    { name: "Reports", icon: Boxes, href: "/reports" },
    { name: "Settings", icon: Boxes, href: "/settings" },
  ];
  const metrics = [
    [
      "Inventory products",
      products.length,
      `${ingredientsResult.data?.length ?? 0} generic ingredients`,
    ],
    ["Cocktails", cocktailsResult.data?.length ?? 0, "Active recipes"],
    [
      "Low stock",
      lowStock.length,
      lowStock.length
        ? "Needs purchasing attention"
        : "Configured levels healthy",
    ],
    ["Drinks today", drinksToday, `${totals?.events ?? 0} production events`],
  ] as const;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <WorkspaceNav />
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground">
              <GlassWater size={20} />
            </span>
            <div>
              <p className="font-semibold leading-tight">{organization.name}</p>
              <p className="text-xs text-muted-foreground">{location.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {email}
            </span>
            <form action={logout}>
              <button
                className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-surface-muted"
                type="submit"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[210px_1fr]">
        <nav className="space-y-1">
          {navigation.map(({ name, icon: Icon, active, href }) => (
            <Link
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-surface hover:text-foreground"}`}
              href={href}
              key={name}
            >
              <Icon size={18} />
              {name}
            </Link>
          ))}
        </nav>
        <section>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-medium text-accent-strong">Operations</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.035em]">
                Today at {location.name}
              </h1>
              <p className="mt-2 text-muted-foreground">
                Live stock, menu, and production activity.
              </p>
            </div>
            <span className="w-fit rounded-full bg-success-soft px-3 py-1.5 text-xs font-semibold text-success">
              Workspace connected
            </span>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map(([label, value, detail]) => (
              <article
                className="rounded-2xl border border-border bg-surface p-5"
                key={label}
              >
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-3 text-4xl font-semibold tracking-tight">
                  {value}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">{detail}</p>
              </article>
            ))}
          </div>
          {lowStock.length > 0 ? (
            <article className="mt-6 overflow-hidden rounded-2xl border border-accent-border bg-surface">
              <div className="flex items-center justify-between border-b border-accent-border px-6 py-5">
                <div className="flex items-center gap-3">
                  <CircleAlert className="text-warning" size={20} />
                  <div>
                    <h2 className="font-semibold">Low-stock attention</h2>
                    <p className="text-sm text-muted-foreground">
                      {lowStock.length} product
                      {lowStock.length === 1 ? "" : "s"} at or below reorder
                      level.
                    </p>
                  </div>
                </div>
                <Link
                  className="text-sm font-semibold text-accent-strong"
                  href="/purchasing"
                >
                  Open plan →
                </Link>
              </div>
              {lowStock.slice(0, 5).map((item) => {
                const product = productMap.get(item.inventory_product_id);
                return (
                  <div
                    className="flex items-center justify-between border-b border-border-subtle px-6 py-4 last:border-0"
                    key={item.inventory_product_id}
                  >
                    <span className="text-sm font-semibold">
                      {product
                        ? `${product.brand} ${product.name}`
                        : "Unknown product"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatStockQuantity(
                        balances.get(item.inventory_product_id) ?? 0,
                        product
                          ? (ingredientMap.get(product.ingredient_id)
                              ?.base_unit ?? "each")
                          : "each",
                        product?.stock_unit,
                      )}{" "}
                      remaining
                    </span>
                  </div>
                );
              })}
            </article>
          ) : (
            <article className="mt-6 flex items-center justify-between rounded-2xl border border-border bg-surface px-6 py-5">
              <div>
                <h2 className="font-semibold">Inventory levels are healthy</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  No configured products need reordering.
                </p>
              </div>
              <Link
                className="text-sm font-semibold text-secondary"
                href="/inventory"
              >
                Review inventory →
              </Link>
            </article>
          )}
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Link
              className="flex items-center justify-between rounded-2xl border border-border bg-surface p-6 hover:border-accent-border"
              href="/service"
            >
              <span>
                <span className="block font-semibold">Open service menu</span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  Make drinks and record exact products poured.
                </span>
              </span>
              <ChevronRight className="text-muted-foreground" />
            </Link>
            <Link
              className="flex items-center justify-between rounded-2xl border border-border bg-surface p-6 hover:border-accent-border"
              href="/purchasing"
            >
              <span>
                <span className="block font-semibold">
                  Review purchase plan
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  Replenish products to target stock.
                </span>
              </span>
              <ChevronRight className="text-muted-foreground" />
            </Link>
          </div>
          {membership.role === "owner" ? <StarterBarCard /> : null}
        </section>
      </div>
    </main>
  );
}
