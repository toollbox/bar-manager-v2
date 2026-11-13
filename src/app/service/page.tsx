import { ArrowLeft, Martini, PackageSearch } from "lucide-react";
import Link from "next/link";

import { CatalogImage } from "@/app/inventory/catalog-image";
import { MakeDrinkForm } from "@/app/service/make-drink-form";
import { ServiceMenu } from "@/app/service/service-menu";
import { requireWorkspace } from "@/data/workspace";
import { WorkspaceNav } from "@/components/workspace-nav";
import { calculateCocktailAvailability } from "@/domain/availability";
import { getCocktailPhoto, getDefaultCatalogImage } from "@/lib/catalog-images";

export default async function ServicePage() {
  const { supabase, membership, location } = await requireWorkspace();

  const [
    cocktailsResult,
    recipeResult,
    ingredientsResult,
    productsResult,
    balancesResult,
    settingsResult,
    historyResult,
  ] = await Promise.all([
    supabase
      .from("cocktails")
      .select(
        "id, name, description, instructions, glassware, garnish, image_path, image_url",
      )
      .eq("organization_id", membership.organization_id)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("cocktail_ingredients")
      .select(
        "id, cocktail_id, ingredient_id, preferred_product_id, selection_policy, quantity_in_base_unit",
      )
      .eq("organization_id", membership.organization_id),
    supabase
      .from("ingredients")
      .select("id, name, category, base_unit, is_active")
      .eq("organization_id", membership.organization_id),
    supabase
      .from("inventory_products")
      .select("id, ingredient_id, brand, name")
      .eq("organization_id", membership.organization_id)
      .eq("is_active", true),
    supabase
      .from("inventory_balances")
      .select("inventory_product_id, quantity")
      .eq("location_id", location.id),
    supabase
      .from("location_products")
      .select("inventory_product_id, is_available")
      .eq("location_id", location.id),
    supabase
      .from("cocktail_productions")
      .select("id, cocktail_name, quantity, created_at")
      .eq("location_id", location.id)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  if (
    [
      cocktailsResult,
      recipeResult,
      ingredientsResult,
      productsResult,
      balancesResult,
      settingsResult,
      historyResult,
    ].some((result) => result.error)
  )
    throw new Error("Unable to load service data. Please try again.");
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
      item.is_available,
    ]),
  );
  const stock = (productsResult.data ?? []).map((product) => ({
    id: product.id,
    ingredientId: product.ingredient_id,
    label: `${product.brand} ${product.name}`,
    quantity: balances.get(product.id) ?? 0,
    isAvailable:
      (settings.get(product.id) ?? false) &&
      (ingredients.get(product.ingredient_id)?.is_active ?? false),
  }));
  const cocktails = (cocktailsResult.data ?? [])
    .map((cocktail) => {
      const recipe = (recipeResult.data ?? [])
        .filter((line) => line.cocktail_id === cocktail.id)
        .flatMap((line) => {
          const ingredient = ingredients.get(line.ingredient_id);
          return ingredient
            ? [
                {
                  lineId: line.id,
                  ingredientId: ingredient.id,
                  ingredientName: ingredient.name,
                  unit: ingredient.base_unit,
                  required: Number(line.quantity_in_base_unit),
                  selectionPolicy: line.selection_policy,
                  preferredProductId: line.preferred_product_id,
                },
              ]
            : [];
        });
      return {
        ...cocktail,
        availability: calculateCocktailAvailability(recipe, stock),
      };
    })
    .sort(
      (left, right) =>
        Number(right.availability.canMake) -
          Number(left.availability.canMake) ||
        left.name.localeCompare(right.name),
    );
  const availableCount = cocktails.filter(
    (cocktail) => cocktail.availability.canMake,
  ).length;

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
              <p className="font-semibold">Service</p>
              <p className="text-xs text-stone-500">{location.name}</p>
            </div>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            {availableCount} of {cocktails.length} available
          </span>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-6 py-8">
        <p className="text-sm font-medium text-amber-700">Live menu</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-[-0.035em]">
          What can we make?
        </h1>
        <p className="mt-2 max-w-2xl text-stone-500">
          Availability uses current stock and recipe brand rules. Preferred
          products appear first, followed by valid substitutions.
        </p>
        {cocktails.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center">
            <Martini className="mx-auto text-stone-400" size={30} />
            <h2 className="mt-4 font-semibold">No cocktails on the menu</h2>
            <Link
              className="mt-3 inline-block text-sm font-semibold text-amber-700"
              href="/cocktails"
            >
              Create a cocktail →
            </Link>
          </div>
        ) : (
          <ServiceMenu
            drinks={cocktails.map((cocktail) => {
              const photo =
                !cocktail.image_path && !cocktail.image_url
                  ? getCocktailPhoto(cocktail.name)
                  : undefined;
              return {
                id: cocktail.id,
                name: cocktail.name,
                canMake: cocktail.availability.canMake,
                baseSpirits: cocktail.availability.lines.flatMap((line) => {
                  const ingredient = ingredients.get(line.ingredientId);
                  return ingredient &&
                    /^spirits?$/i.test(ingredient.category.trim())
                    ? [{ id: ingredient.id, name: ingredient.name }]
                    : [];
                }),
                searchText: [
                  cocktail.name,
                  cocktail.description,
                  ...cocktail.availability.lines.flatMap((line) => [
                    line.ingredientName,
                    ...line.products.map((product) => product.label),
                  ]),
                ]
                  .filter(Boolean)
                  .join(" "),
                thumbnail: (
                  <CatalogImage
                    alt={`${cocktail.name} cocktail`}
                    aspect="square"
                    canUpload={false}
                    compact
                    currentPath={cocktail.image_path}
                    entityId={cocktail.id}
                    entityType="cocktails"
                    fallbackUrl={getDefaultCatalogImage(
                      "cocktail",
                      cocktail.name,
                    )}
                    imageUrl={cocktail.image_url}
                    organizationId={membership.organization_id}
                  />
                ),
                details: (
                  <>
                    <div className="border-t border-stone-100 px-5 py-4">
                      <p className="text-sm text-stone-500">
                        {cocktail.description ||
                          [cocktail.glassware, cocktail.garnish]
                            .filter(Boolean)
                            .join(" · ") ||
                          "Recipe-defined cocktail"}
                      </p>
                      <p className="mt-3 whitespace-pre-line text-sm text-stone-700">
                        {cocktail.instructions}
                      </p>
                      <p
                        className={`mt-3 text-xs font-semibold ${cocktail.availability.canMake ? "text-emerald-700" : "text-amber-700"}`}
                      >
                        {cocktail.availability.canMake
                          ? `${cocktail.availability.maxServings} serving${cocktail.availability.maxServings === 1 ? "" : "s"} possible`
                          : "Cannot make right now"}
                      </p>
                      {photo ? (
                        <p className="mt-3 text-[10px] text-stone-500">
                          Photo:{" "}
                          <a
                            className="underline"
                            href={photo.source}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {photo.author}
                          </a>
                          {" · "}
                          {photo.licenseUrl ? (
                            <a
                              className="underline"
                              href={photo.licenseUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {photo.license}
                            </a>
                          ) : (
                            photo.license
                          )}
                          {" · Resized/cropped for display."}
                        </p>
                      ) : null}
                    </div>
                    <div className="divide-y divide-stone-100 px-5">
                      {cocktail.availability.lines.length === 0 ? (
                        <p className="py-5 text-sm text-amber-700">
                          Recipe has no ingredients.
                        </p>
                      ) : (
                        cocktail.availability.lines.map((line) => (
                          <div className="py-4" key={line.lineId}>
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold">
                                {line.required.toLocaleString()} {line.unit}{" "}
                                {line.ingredientName}
                              </p>
                              <span
                                className={`text-xs font-semibold ${line.canMake ? "text-emerald-700" : "text-rose-700"}`}
                              >
                                {line.available.toLocaleString()} {line.unit}{" "}
                                across eligible products
                              </span>
                            </div>
                            {line.products.length ? (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {line.products.map((product, index) => (
                                  <span
                                    className={`rounded-full px-2.5 py-1 text-xs ${index === 0 && line.preferredProductId === product.id ? "bg-amber-100 text-amber-800" : "bg-stone-100 text-stone-600"}`}
                                    key={product.id}
                                  >
                                    {product.label} ·{" "}
                                    {product.quantity.toLocaleString()}{" "}
                                    {line.unit}
                                    {index === 0 &&
                                    line.preferredProductId === product.id
                                      ? " · preferred"
                                      : ""}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-2 flex items-center gap-1.5 text-xs text-rose-600">
                                <PackageSearch size={14} />
                                No eligible product in stock
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                    {cocktail.availability.canMake ? (
                      <MakeDrinkForm
                        requestId={crypto.randomUUID()}
                        cocktailId={cocktail.id}
                        lines={cocktail.availability.lines}
                        locationId={location.id}
                        maxServings={cocktail.availability.maxServings}
                      />
                    ) : null}
                  </>
                ),
              };
            })}
          />
        )}
        {(historyResult.data ?? []).length > 0 ? (
          <section className="mt-8 rounded-2xl border border-stone-200 bg-white">
            <div className="border-b border-stone-100 px-6 py-4">
              <h2 className="font-semibold">Recent production</h2>
              <p className="mt-1 text-sm text-stone-500">
                The latest drinks recorded at {location.name}.
              </p>
            </div>
            <div className="divide-y divide-stone-100">
              {(historyResult.data ?? []).map((production) => (
                <div
                  className="flex items-center justify-between px-6 py-4 text-sm"
                  key={production.id}
                >
                  <div>
                    <p className="font-semibold">{production.cocktail_name}</p>
                    <p className="mt-0.5 text-xs text-stone-400">
                      {new Date(production.created_at).toLocaleString("en-US", {
                        timeZone: location.timezone,
                      })}
                    </p>
                  </div>
                  <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold">
                    × {production.quantity}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
