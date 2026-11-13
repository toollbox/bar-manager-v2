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
import { formatStockQuantity, unitLabel } from "@/domain/units";
import {
  getDefaultCatalogImage,
  getInventoryPhoto,
} from "@/lib/catalog-images";

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
      .select(
        "id, name, category, base_unit, default_unit, image_path, image_url, is_active",
      )
      .eq("organization_id", membership.organization_id)
      .order("name"),
    supabase
      .from("inventory_products")
      .select(
        "id, ingredient_id, brand, name, variant, bottle_size, stock_unit, image_path, image_url, is_active",
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
  const categories = Array.from(
    new Set(allIngredients.map((ingredient) => ingredient.category)),
  );
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
              <p className="font-semibold">Inventory</p>
              <p className="text-xs text-muted-foreground">{location.name}</p>
            </div>
          </div>
          <span className="rounded-full bg-surface px-3 py-1.5 text-xs font-semibold text-muted-foreground ring-1 ring-border">
            {membership.role}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-accent-strong">Stock room</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-[-0.035em]">
              Branded inventory
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Recipes use generic ingredients. Stock and consumption use the
              exact brand selected by the bartender.
            </p>
          </div>
          <div className="flex gap-2 text-sm">
            <span className="rounded-xl bg-surface px-3 py-2 ring-1 ring-border">
              {ingredients.length} ingredients
            </span>
            <span className="rounded-xl bg-surface px-3 py-2 ring-1 ring-border">
              {products.length} products
            </span>
          </div>
        </div>

        {canManage ? (
          <section className="mt-8 grid gap-6 lg:grid-cols-2">
            <article className="rounded-2xl border border-border bg-surface p-6">
              <div className="mb-5 flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-surface-subtle">
                  <Boxes size={19} />
                </span>
                <div>
                  <h2 className="font-semibold">1. General Products</h2>
                  <p className="text-sm text-muted-foreground">
                    Example: Vodka, Gin, Lime Juice
                  </p>
                </div>
              </div>
              <IngredientForm categories={categories} />
            </article>

            <article className="rounded-2xl border border-border bg-surface p-6">
              <div className="mb-5 flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent-strong">
                  <Tags size={19} />
                </span>
                <div>
                  <h2 className="font-semibold">2. Branded product</h2>
                  <p className="text-sm text-muted-foreground">
                    Example: Smirnoff No. 21
                  </p>
                </div>
              </div>
              <ProductForm ingredients={ingredients} locationId={location.id} />
            </article>
          </section>
        ) : null}

        {ingredients.length > 0 ? (
          <section className="mt-8 overflow-hidden rounded-2xl border border-border bg-surface">
            <div className="flex items-center justify-between gap-4 border-b border-border-subtle px-6 py-5">
              <div>
                <h2 className="font-semibold">General Products</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Generic products used in recipes. Stock is tracked by brand in
                  the products list below.
                </p>
              </div>
              <a
                className="text-xs font-medium text-muted-foreground hover:text-secondary"
                href="/images/inventory/credits.json"
                rel="noreferrer"
                target="_blank"
              >
                Photo sources & licenses
              </a>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3 font-semibold" scope="col">
                      Product
                    </th>
                    <th className="px-4 py-3 font-semibold" scope="col">
                      Category
                    </th>
                    <th className="px-4 py-3 font-semibold" scope="col">
                      Base unit
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {ingredients.map((ingredient) => {
                    const photo = getInventoryPhoto({ name: ingredient.name });
                    return (
                      <tr key={ingredient.id}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <CatalogImage
                              alt={`${ingredient.name} ingredient`}
                              canUpload={canManage}
                              compact
                              currentPath={ingredient.image_path}
                              entityId={ingredient.id}
                              entityType="ingredients"
                              fallbackUrl={getDefaultCatalogImage(
                                "inventory",
                                ingredient.name,
                              )}
                              credit={photo}
                              fit={photo?.fit}
                              imageUrl={ingredient.image_url}
                              organizationId={membership.organization_id}
                            />
                            <div>
                              <p className="font-semibold">{ingredient.name}</p>
                              {canManage ? (
                                <IngredientEditForm
                                  ingredient={ingredient}
                                  categories={categories}
                                />
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-secondary">
                          {ingredient.category}
                        </td>
                        <td className="px-4 py-4 text-muted-foreground">
                          {unitLabel(ingredient.default_unit)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {canManage ? (
          <section className="mt-8 rounded-2xl border border-border bg-surface p-6">
            <div className="mb-5">
              <h2 className="font-semibold">Record a stock movement</h2>
              <p className="mt-1 text-sm text-muted-foreground">
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
                stockUnit: row.stock_unit,
              }))}
            />
          </section>
        ) : null}

        <section className="mt-8 overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border-subtle px-6 py-5">
            <div>
              <h2 className="font-semibold">Products at {location.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Opening stock and future movements update these balances.
              </p>
            </div>
            {lowStockCount > 0 ? (
              <span className="flex items-center gap-1.5 rounded-full bg-warning-soft px-3 py-1.5 text-xs font-semibold text-warning">
                <CircleAlert size={14} /> {lowStockCount} low
              </span>
            ) : null}
          </div>

          {rows.length === 0 ? (
            <div className="grid place-items-center px-6 py-16 text-center">
              <span className="grid size-12 place-items-center rounded-2xl bg-surface-subtle text-muted-foreground">
                <PackageCheck size={22} />
              </span>
              <h3 className="mt-4 font-semibold">No branded products yet</h3>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Create a generic ingredient above, then add the specific bottle
                or product you stock.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Product</th>
                    <th className="px-4 py-3 font-semibold">Ingredient</th>
                    <th className="px-4 py-3 font-semibold">On hand</th>
                    <th className="px-4 py-3 font-semibold">Reorder at</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {rows.map((row) => {
                    const photo = getInventoryPhoto({
                      name: row.name,
                      brand: row.brand,
                      ingredientName: row.ingredient?.name,
                    });
                    return (
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
                              fallbackUrl={photo?.src ?? fallbackImage}
                              credit={photo}
                              fit={photo?.fit}
                              imageUrl={row.image_url}
                              organizationId={membership.organization_id}
                            />
                            <div>
                              <p className="font-semibold">
                                {row.brand} {row.name}
                              </p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {row.bottle_size
                                  ? formatStockQuantity(
                                      row.bottle_size,
                                      row.ingredient?.base_unit ?? "each",
                                      row.stock_unit,
                                    )
                                  : "Size not set"}
                              </p>
                              {!row.image_path &&
                              !row.image_url &&
                              photo?.isIngredientReference ? (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Ingredient reference photo
                                </p>
                              ) : null}
                              {canManage ? (
                                <ProductEditForm
                                  baseUnit={row.ingredient?.base_unit ?? "each"}
                                  locationId={location.id}
                                  product={row}
                                />
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-secondary">
                          {row.ingredient?.name ?? "Unknown"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 font-semibold">
                          {formatStockQuantity(
                            row.quantity,
                            row.ingredient?.base_unit ?? "each",
                            row.stock_unit,
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-muted-foreground">
                          {formatStockQuantity(
                            row.reorderPoint,
                            row.ingredient?.base_unit ?? "each",
                            row.stock_unit,
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.lowStock ? "bg-warning-soft text-warning" : "bg-success-soft text-success"}`}
                          >
                            {row.lowStock ? "Low stock" : "In stock"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="flex items-center gap-3 border-b border-border-subtle px-6 py-5">
            <span className="grid size-9 place-items-center rounded-xl bg-surface-subtle text-secondary">
              <History size={18} />
            </span>
            <div>
              <h2 className="font-semibold">Recent movement history</h2>
              <p className="text-sm text-muted-foreground">
                An immutable audit trail of stock changes.
              </p>
            </div>
          </div>
          {(movementsResult.data ?? []).length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              No movements recorded yet.
            </p>
          ) : (
            <div className="divide-y divide-border-subtle">
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
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {movement.notes ||
                          movementLabels[movement.movement_type]}
                      </p>
                    </div>
                    <p
                      className={`text-sm font-semibold ${positive ? "text-success" : "text-danger"}`}
                    >
                      {positive ? "+" : ""}
                      {formatStockQuantity(
                        movement.quantity_delta,
                        ingredient?.base_unit ?? "each",
                        product?.stock_unit,
                      )}
                    </p>
                    <time
                      className="text-xs text-muted-foreground"
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
          <section className="mt-8 rounded-2xl border border-border bg-surface p-6">
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
