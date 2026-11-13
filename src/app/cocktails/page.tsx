import { ArrowLeft, Archive, Martini } from "lucide-react";
import Link from "next/link";

import { archiveCocktail } from "@/app/cocktails/actions";
import {
  CocktailCreateForm,
  CocktailEditForm,
  RecipeLineForm,
} from "@/app/cocktails/cocktail-forms";
import { CatalogImage } from "@/app/inventory/catalog-image";
import { requireWorkspace } from "@/data/workspace";
import { WorkspaceNav } from "@/components/workspace-nav";
import { formatQuantity } from "@/domain/units";
import { RemoveLineForm } from "./remove-line-form";
import { getCocktailPhoto, getDefaultCatalogImage } from "@/lib/catalog-images";

export default async function CocktailsPage() {
  const { supabase, membership } = await requireWorkspace();

  const [cocktailsResult, linesResult, ingredientsResult, productsResult] =
    await Promise.all([
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
          "id, cocktail_id, ingredient_id, preferred_product_id, selection_policy, quantity_in_base_unit, notes",
        )
        .eq("organization_id", membership.organization_id)
        .order("created_at"),
      supabase
        .from("ingredients")
        .select("id, name, base_unit, default_unit, is_active")
        .eq("organization_id", membership.organization_id)
        .order("name"),
      supabase
        .from("inventory_products")
        .select("id, ingredient_id, brand, name, is_active")
        .eq("organization_id", membership.organization_id)
        .order("brand"),
    ]);
  if (
    [cocktailsResult, linesResult, ingredientsResult, productsResult].some(
      (r) => r.error,
    )
  )
    throw new Error("Unable to load recipes.");
  const cocktails = cocktailsResult.data ?? [];
  const lines = linesResult.data ?? [];
  const allIngredients = ingredientsResult.data ?? [];
  const allProducts = productsResult.data ?? [];
  const ingredients = allIngredients.filter((item) => item.is_active);
  const products = allProducts.filter((item) => item.is_active);
  const ingredientMap = new Map(allIngredients.map((item) => [item.id, item]));
  const productMap = new Map(allProducts.map((item) => [item.id, item]));
  const canManage =
    membership.role === "owner" || membership.role === "manager";
  const ruleLabels = {
    any_product: "Any available brand",
    prefer_product: "Prefer",
    require_product: "Require",
  } as const;

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
              <p className="font-semibold">Cocktails & recipes</p>
              <p className="text-xs text-muted-foreground">Build the service menu</p>
            </div>
          </div>
          <span className="rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground ring-1 ring-border">
            {membership.role}
          </span>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div>
          <p className="text-sm font-medium text-accent-strong">Recipe book</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.035em]">
            Cocktail management
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Define each drink once, then choose whether its recipe accepts any
            brand, prefers one, or requires one.
          </p>
        </div>

        {canManage ? (
          <section className="mt-8 rounded-2xl border border-border bg-surface p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent-strong">
                <Martini size={19} />
              </span>
              <div>
                <h2 className="font-semibold">Create a cocktail</h2>
                <p className="text-sm text-muted-foreground">
                  Add the drink first, then build its ingredient list.
                </p>
              </div>
            </div>
            <CocktailCreateForm />
          </section>
        ) : null}

        <section className="mt-8 space-y-6">
          {cocktails.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border-strong bg-surface px-6 py-16 text-center">
              <Martini className="mx-auto text-muted-foreground" size={30} />
              <h2 className="mt-4 font-semibold">No cocktails yet</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Create the first drink above.
              </p>
            </div>
          ) : (
            cocktails.map((cocktail) => {
              const recipe = lines.filter(
                (line) => line.cocktail_id === cocktail.id,
              );
              return (
                <article
                  className="overflow-hidden rounded-2xl border border-border bg-surface"
                  key={cocktail.id}
                >
                  <div className="grid lg:grid-cols-[260px_1fr]">
                    <div className="border-b border-border-subtle p-4 lg:border-b-0 lg:border-r">
                      <CatalogImage
                        alt={`${cocktail.name} cocktail`}
                        aspect="portrait"
                        canUpload={canManage}
                        currentPath={cocktail.image_path}
                        entityId={cocktail.id}
                        entityType="cocktails"
                        fallbackUrl={getDefaultCatalogImage(
                          "cocktail",
                          cocktail.name,
                        )}
                        credit={getCocktailPhoto(cocktail.name)}
                        imageUrl={cocktail.image_url}
                        organizationId={membership.organization_id}
                      />
                    </div>
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h2 className="text-xl font-semibold">
                            {cocktail.name}
                          </h2>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {cocktail.description || "No description yet"}
                          </p>
                        </div>
                        {canManage ? (
                          <form action={archiveCocktail}>
                            <input
                              name="id"
                              type="hidden"
                              value={cocktail.id}
                            />
                            <button
                              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-muted-foreground hover:bg-danger-soft hover:text-danger"
                              title="Archive cocktail"
                            >
                              <Archive size={15} /> Archive
                            </button>
                          </form>
                        ) : null}
                      </div>
                      <div className="mt-5">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Recipe
                        </h3>
                        {recipe.length === 0 ? (
                          <p className="mt-3 rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent-strong">
                            This cocktail needs ingredients before availability
                            can be calculated.
                          </p>
                        ) : (
                          <ul className="mt-2 divide-y divide-border-subtle">
                            {recipe.map((line) => {
                              const ingredient = ingredientMap.get(
                                line.ingredient_id,
                              );
                              const product = line.preferred_product_id
                                ? productMap.get(line.preferred_product_id)
                                : undefined;
                              return (
                                <li
                                  className="flex items-center justify-between gap-4 py-3"
                                  key={line.id}
                                >
                                  <div>
                                    <p className="text-sm font-semibold">
                                      {formatQuantity(
                                        Number(line.quantity_in_base_unit),
                                        ingredient?.base_unit,
                                      )}{" "}
                                      {ingredient?.name}
                                    </p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                      {ruleLabels[line.selection_policy]}
                                      {product
                                        ? ` ${product.brand} ${product.name}`
                                        : ""}
                                      {line.notes ? ` · ${line.notes}` : ""}
                                    </p>
                                  </div>
                                  {canManage ? (
                                    <RemoveLineForm id={line.id} />
                                  ) : null}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                      {canManage ? (
                        <div className="mt-5">
                          <RecipeLineForm
                            cocktailId={cocktail.id}
                            ingredients={ingredients}
                            products={products}
                          />
                          <details className="mt-4 rounded-xl border border-border">
                            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-secondary">
                              Edit cocktail details
                            </summary>
                            <div className="border-t border-border-subtle p-4">
                              <CocktailEditForm cocktail={cocktail} />
                            </div>
                          </details>
                        </div>
                      ) : (
                        <p className="mt-5 text-sm text-muted-foreground">
                          Only owners and managers can edit recipes.
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}
