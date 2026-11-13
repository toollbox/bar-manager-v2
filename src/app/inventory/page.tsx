import {
  ArrowLeft,
  Boxes,
  CircleAlert,
  History,
  PackageCheck,
  Tags,
} from "lucide-react";
import Link from "next/link";

import {
  ActiveForm,
  IngredientEditForm,
  ProductEditForm,
} from "@/app/inventory/edit-forms";
import { CatalogImage } from "@/app/inventory/catalog-image";
import {
  IngredientForm,
  ProductForm,
  StockMovementForm,
} from "@/app/inventory/inventory-forms";
import { requireWorkspace } from "@/data/workspace";
import { WorkspaceNav } from "@/components/workspace-nav";
import { getDefaultCatalogImage } from "@/lib/catalog-images";

export default async function InventoryPage() {
  const { supabase, membership, location, canManage } =
    await requireWorkspace();

  const [
    ingredientsResult,
    productsResult,
    balancesResult,
    settingsResult,
    movementsResult,
  ] = await Promise.all([
    supabase
      .from("ingredients")
      .select("id, name, category, base_unit, image_path, image_url, is_active")
      .eq("organization_id", membership.organization_id)
      .order("name"),
    supabase
      .from("inventory_products")
      .select(
        "id, ingredient_id, brand, name, variant, bottle_size, default_cost, image_path, image_url, is_active",
      )
      .eq("organization_id", membership.organization_id)
      .order("brand"),
    supabase
      .from("inventory_balances")
      .select("inventory_product_id, quantity")
      .eq("location_id", location.id),
    supabase
      .from("location_products")
      .select("inventory_product_id, reorder_point, target_stock")
      .eq("location_id", location.id),
    supabase
      .from("inventory_movements")
      .select(
        "id, inventory_product_id, movement_type, quantity_delta, notes, created_at",
      )
      .eq("location_id", location.id)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  if (
    [
      ingredientsResult,
      productsResult,
      balancesResult,
      settingsResult,
      movementsResult,
    ].some((result) => result.error)
  )
    throw new Error("Unable to load inventory data. Please try again.");
  const allIngredients = ingredientsResult.data ?? [];
  const ingredients = allIngredients.filter((item) => item.is_active);
  const allProducts = productsResult.data ?? [];
  const products = allProducts.filter((item) => item.is_active);
  const balances = new Map(
    (balancesResult.data ?? []).map((row) => [
      row.inventory_product_id,
      row.quantity,
    ]),
  );
  const settings = new Map(
    (settingsResult.data ?? []).map((row) => [row.inventory_product_id, row]),
  );
  const ingredientMap = new Map(allIngredients.map((item) => [item.id, item]));
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
  const productMap = new Map(
    allProducts.map((product) => [product.id, product]),
  );
  const movementLabels: Record<string, string> = {
    opening_balance: "Opening balance",
    purchase: "Stock received",
    waste: "Waste",
    spill: "Spill",
    correction: "Correction",
    drink_production: "Drink production",
    transfer_in: "Transfer in",
    transfer_out: "Transfer out",
  };
  const fallbackImage = getDefaultCatalogImage("inventory");

  return (
    <main className="min-h-screen bg-[#f5f3ee] text-stone-950">
      <WorkspaceNav />
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link
              className="grid size-10 place-items-center rounded-xl border border-stone-200 hover:bg-stone-50"
              href="/dashboard"
            >
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
            <h1 className="mt-1 text-3xl font-semibold tracking-[-0.035em]">
              Branded inventory
            </h1>
            <p className="mt-2 max-w-2xl text-stone-500">
              Recipes use generic ingredients. Stock and consumption use the
              exact brand selected by the bartender.
            </p>
          </div>
          <div className="flex gap-2 text-sm">
            <span className="rounded-xl bg-white px-3 py-2 ring-1 ring-stone-200">
              {ingredients.length} ingredients
            </span>
            <span className="rounded-xl bg-white px-3 py-2 ring-1 ring-stone-200">
              {products.length} products
            </span>
          </div>
        </div>

        {canManage ? (
          <section className="mt-8 grid gap-6 lg:grid-cols-2">
            <article className="rounded-2xl border border-stone-200 bg-white p-6">
              <div className="mb-5 flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-stone-100">
                  <Boxes size={19} />
                </span>
                <div>
                  <h2 className="font-semibold">1. Generic ingredient</h2>
                  <p className="text-sm text-stone-500">
                    Example: Vodka, Gin, Lime Juice
                  </p>
                </div>
              </div>
              <IngredientForm />
            </article>

            <article className="rounded-2xl border border-stone-200 bg-white p-6">
              <div className="mb-5 flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-amber-100 text-amber-800">
                  <Tags size={19} />
                </span>
                <div>
                  <h2 className="font-semibold">2. Branded product</h2>
                  <p className="text-sm text-stone-500">
                    Example: Smirnoff No. 21
                  </p>
                </div>
              </div>
              <ProductForm ingredients={ingredients} locationId={location.id} />
            </article>
          </section>
        ) : null}

        {ingredients.length > 0 ? (
          <section className="mt-8">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <h2 className="font-semibold">Ingredient images</h2>
                <p className="mt-1 text-sm text-stone-500">
                  Uploaded images replace the curated web default.
                </p>
              </div>
              <a
                className="text-xs font-medium text-stone-400 hover:text-stone-700"
                href="https://unsplash.com"
                rel="noreferrer"
                target="_blank"
              >
                Default photography via Unsplash
              </a>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {ingredients.map((ingredient) => (
                <article
                  className="rounded-2xl border border-stone-200 bg-white p-3"
                  key={ingredient.id}
                >
                  <CatalogImage
                    alt={`${ingredient.name} ingredient`}
                    canUpload={canManage}
                    currentPath={ingredient.image_path}
                    entityId={ingredient.id}
                    entityType="ingredients"
                    fallbackUrl={fallbackImage}
                    imageUrl={ingredient.image_url}
                    organizationId={membership.organization_id}
                  />
                  <div className="px-1 pb-1 pt-3">
                    <p className="font-semibold">{ingredient.name}</p>
                    <p className="text-xs text-stone-400">
                      {ingredient.category} · {ingredient.base_unit}
                    </p>
                    {canManage ? (
                      <IngredientEditForm ingredient={ingredient} />
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {canManage ? (
          <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-6">
            <div className="mb-5">
              <h2 className="font-semibold">Record a stock movement</h2>
              <p className="mt-1 text-sm text-stone-500">
                Receive deliveries, record losses, or reconcile a physical
                count.
              </p>
            </div>
            <StockMovementForm
              locationId={location.id}
              products={rows.map((row) => ({
                id: row.id,
                label: `${row.brand} ${row.name}`,
                unit: row.ingredient?.base_unit ?? "each",
                quantity: row.quantity,
              }))}
            />
          </section>
        ) : null}

        <section className="mt-8 overflow-hidden rounded-2xl border border-stone-200 bg-white">
          <div className="flex items-center justify-between border-b border-stone-100 px-6 py-5">
            <div>
              <h2 className="font-semibold">Products at {location.name}</h2>
              <p className="mt-1 text-sm text-stone-500">
                Opening stock and future movements update these balances.
              </p>
            </div>
            {lowStockCount > 0 ? (
              <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800">
                <CircleAlert size={14} /> {lowStockCount} low
              </span>
            ) : null}
          </div>

          {rows.length === 0 ? (
            <div className="grid place-items-center px-6 py-16 text-center">
              <span className="grid size-12 place-items-center rounded-2xl bg-stone-100 text-stone-500">
                <PackageCheck size={22} />
              </span>
              <h3 className="mt-4 font-semibold">No branded products yet</h3>
              <p className="mt-1 max-w-md text-sm text-stone-500">
                Create a generic ingredient above, then add the specific bottle
                or product you stock.
              </p>
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
                        <div className="flex items-center gap-3">
                          <CatalogImage
                            alt={`${row.brand} ${row.name}`}
                            canUpload={canManage}
                            compact
                            currentPath={row.image_path}
                            entityId={row.id}
                            entityType="products"
                            fallbackUrl={fallbackImage}
                            imageUrl={row.image_url}
                            organizationId={membership.organization_id}
                          />
                          <div>
                            <p className="font-semibold">
                              {row.brand} {row.name}
                            </p>
                            <p className="mt-0.5 text-xs text-stone-400">
                              {row.bottle_size
                                ? `${row.bottle_size} ${row.ingredient?.base_unit}`
                                : "Size not set"}
                            </p>
                            {canManage ? (
                              <ProductEditForm
                                locationId={location.id}
                                product={row}
                              />
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-stone-600">
                        {row.ingredient?.name ?? "Unknown"}
                      </td>
                      <td className="px-4 py-4 font-semibold">
                        {row.quantity.toLocaleString()}{" "}
                        {row.ingredient?.base_unit}
                      </td>
                      <td className="px-4 py-4 text-stone-500">
                        {row.reorderPoint.toLocaleString()}{" "}
                        {row.ingredient?.base_unit}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.lowStock ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700"}`}
                        >
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

        <section className="mt-8 overflow-hidden rounded-2xl border border-stone-200 bg-white">
          <div className="flex items-center gap-3 border-b border-stone-100 px-6 py-5">
            <span className="grid size-9 place-items-center rounded-xl bg-stone-100 text-stone-600">
              <History size={18} />
            </span>
            <div>
              <h2 className="font-semibold">Recent movement history</h2>
              <p className="text-sm text-stone-500">
                An immutable audit trail of stock changes.
              </p>
            </div>
          </div>
          {(movementsResult.data ?? []).length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-stone-500">
              No movements recorded yet.
            </p>
          ) : (
            <div className="divide-y divide-stone-100">
              {(movementsResult.data ?? []).map((movement) => {
                const product = productMap.get(movement.inventory_product_id);
                const ingredient = product
                  ? ingredientMap.get(product.ingredient_id)
                  : undefined;
                const positive = movement.quantity_delta > 0;
                return (
                  <div
                    className="grid gap-2 px-6 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-8"
                    key={movement.id}
                  >
                    <div>
                      <p className="text-sm font-semibold">
                        {product
                          ? `${product.brand} ${product.name}`
                          : "Unknown product"}
                      </p>
                      <p className="mt-0.5 text-xs text-stone-400">
                        {movement.notes ||
                          movementLabels[movement.movement_type]}
                      </p>
                    </div>
                    <p
                      className={`text-sm font-semibold ${positive ? "text-emerald-700" : "text-rose-600"}`}
                    >
                      {positive ? "+" : ""}
                      {movement.quantity_delta.toLocaleString()}{" "}
                      {ingredient?.base_unit}
                    </p>
                    <time
                      className="text-xs text-stone-400"
                      dateTime={movement.created_at}
                    >
                      {new Intl.DateTimeFormat("en-US", {
                        timeZone: location.timezone,
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      }).format(new Date(movement.created_at))}
                    </time>
                  </div>
                );
              })}
            </div>
          )}
        </section>
        {canManage &&
        (allProducts.some((p) => !p.is_active) ||
          allIngredients.some((i) => !i.is_active)) ? (
          <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="font-semibold">Archived catalog</h2>
            {allIngredients
              .filter((i) => !i.is_active)
              .map((i) => (
                <div className="mt-3 text-sm" key={i.id}>
                  {i.name}
                  <ActiveForm active={false} entity="ingredients" id={i.id} />
                </div>
              ))}
            {allProducts
              .filter((p) => !p.is_active)
              .map((p) => (
                <div className="mt-3 text-sm" key={p.id}>
                  {p.brand} {p.name}
                  <ActiveForm
                    active={false}
                    entity="inventory_products"
                    id={p.id}
                  />
                </div>
              ))}
          </section>
        ) : null}
      </div>
    </main>
  );
}
