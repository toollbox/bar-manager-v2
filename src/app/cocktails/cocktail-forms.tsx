"use client";

import { Plus, Save } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import { QuantityField } from "@/components/quantity-field";
import { resolveStockUnit } from "@/domain/units";

import {
  addRecipeLine,
  createCocktail,
  updateCocktail,
  type CocktailFormState,
} from "@/app/cocktails/actions";

const initialState: CocktailFormState = {};
const inputClass =
  "mt-1.5 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10";

function Message({ state }: { state: CocktailFormState }) {
  if (!state.message) return null;
  return (
    <p
      aria-live="polite"
      className={`rounded-xl px-3.5 py-2.5 text-sm ${state.status === "success" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}
    >
      {state.message}
    </p>
  );
}

type CocktailValues = {
  id?: string;
  name?: string;
  description?: string | null;
  instructions?: string;
  glassware?: string | null;
  garnish?: string | null;
  image_url?: string | null;
};

function Fields({ values = {} }: { values?: CocktailValues }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-secondary">
          Name
          <input
            className={inputClass}
            defaultValue={values.name}
            name="name"
            placeholder="Margarita"
            required
          />
        </label>
        <label className="text-sm font-medium text-secondary">
          Glassware
          <input
            className={inputClass}
            defaultValue={values.glassware ?? ""}
            name="glassware"
            placeholder="Coupe"
          />
        </label>
      </div>
      <label className="block text-sm font-medium text-secondary">
        Short description
        <input
          className={inputClass}
          defaultValue={values.description ?? ""}
          maxLength={500}
          name="description"
          placeholder="Bright, tart, and refreshing"
        />
      </label>
      <label className="block text-sm font-medium text-secondary">
        Instructions
        <textarea
          className={inputClass}
          defaultValue={values.instructions}
          name="instructions"
          placeholder="Shake with ice and strain…"
          required
          rows={3}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-secondary">
          Garnish
          <input
            className={inputClass}
            defaultValue={values.garnish ?? ""}
            name="garnish"
            placeholder="Lime wheel"
          />
        </label>
        <label className="text-sm font-medium text-secondary">
          External image URL
          <input
            className={inputClass}
            defaultValue={values.image_url ?? ""}
            name="imageUrl"
            placeholder="https://…"
            type="url"
          />
        </label>
      </div>
    </>
  );
}

export function CocktailCreateForm() {
  const [state, action, pending] = useActionState(createCocktail, initialState);
  return (
    <form action={action} className="space-y-4">
      <Fields />
      {state.errors ? (
        <p className="text-sm text-danger">Check the cocktail details.</p>
      ) : null}
      <Message state={state} />
      <button
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground hover:bg-accent-hover disabled:opacity-60"
        disabled={pending}
      >
        <Plus size={17} />
        {pending ? "Creating…" : "Create cocktail"}
      </button>
    </form>
  );
}

export function CocktailEditForm({
  cocktail,
}: {
  cocktail: Required<Pick<CocktailValues, "id" | "name" | "instructions">> &
    CocktailValues;
}) {
  const action = useMemo(
    () => updateCocktail.bind(null, cocktail.id),
    [cocktail.id],
  );
  const [state, formAction, pending] = useActionState(action, initialState);
  return (
    <form action={formAction} className="space-y-4">
      <Fields values={cocktail} />
      {state.errors ? (
        <p className="text-sm text-danger">Check the cocktail details.</p>
      ) : null}
      <Message state={state} />
      <button
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
        disabled={pending}
      >
        <Save size={16} />
        {pending ? "Saving…" : "Save details"}
      </button>
    </form>
  );
}

type Ingredient = {
  id: string;
  name: string;
  base_unit: "ml" | "g" | "each";
  default_unit: string;
};
type Product = {
  id: string;
  ingredient_id: string;
  brand: string;
  name: string;
};

export function RecipeLineForm({
  cocktailId,
  ingredients,
  products,
}: {
  cocktailId: string;
  ingredients: Ingredient[];
  products: Product[];
}) {
  const [state, action, pending] = useActionState(addRecipeLine, initialState);
  const [ingredientId, setIngredientId] = useState(ingredients[0]?.id ?? "");
  const [policy, setPolicy] = useState("any_product");
  const matchingProducts = products.filter(
    (product) => product.ingredient_id === ingredientId,
  );
  const unit =
    ingredients.find((ingredient) => ingredient.id === ingredientId)
      ?.base_unit ?? "ml";
  return (
    <form
      action={action}
      className="space-y-3 rounded-xl bg-surface-muted p-4"
      onReset={() => {
        setIngredientId(ingredients[0]?.id ?? "");
        setPolicy("any_product");
      }}
    >
      <input name="cocktailId" type="hidden" value={cocktailId} />
      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-xs font-semibold text-secondary">
          Ingredient
          <select
            className={inputClass}
            name="ingredientId"
            onChange={(event) => setIngredientId(event.target.value)}
            required
            value={ingredientId}
          >
            {ingredients.map((ingredient) => (
              <option key={ingredient.id} value={ingredient.id}>
                {ingredient.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-secondary">
          Brand rule
          <select
            className={inputClass}
            name="selectionPolicy"
            onChange={(event) => setPolicy(event.target.value)}
            value={policy}
          >
            <option value="any_product">Any available brand</option>
            <option value="prefer_product">Prefer a brand</option>
            <option value="require_product">Require a brand</option>
          </select>
        </label>
        <div className="text-xs font-semibold text-secondary">
          <QuantityField
            key={ingredientId}
            label="Amount"
            name="quantityInBaseUnit"
            unitName="quantityUnit"
            baseUnit={unit}
            defaultUnit={resolveStockUnit(
              unit,
              ingredients.find((ingredient) => ingredient.id === ingredientId)
                ?.default_unit,
            )}
            min={0.001}
            required
            inputClass={inputClass}
          />
        </div>
      </div>
      {policy === "any_product" ? (
        <input name="preferredProductId" type="hidden" value="" />
      ) : (
        <label className="block text-xs font-semibold text-secondary">
          {policy === "require_product"
            ? "Required product"
            : "Preferred product"}
          <select className={inputClass} name="preferredProductId" required>
            <option value="">Select a matching product</option>
            {matchingProducts.map((product) => (
              <option key={product.id} value={product.id}>
                {product.brand} {product.name}
              </option>
            ))}
          </select>
          {matchingProducts.length === 0 ? (
            <span className="mt-1 block font-normal text-accent-strong">
              Add a branded product for this ingredient first.
            </span>
          ) : null}
        </label>
      )}
      <label className="block text-xs font-semibold text-secondary">
        Recipe note{" "}
        <span className="font-normal text-muted-foreground">(optional)</span>
        <input
          className={inputClass}
          name="notes"
          placeholder="Freshly squeezed, chilled…"
        />
      </label>
      <Message state={state} />
      <button
        className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold hover:bg-surface-subtle disabled:opacity-60"
        disabled={pending || ingredients.length === 0}
      >
        <Plus size={16} />
        {pending ? "Adding…" : "Add ingredient"}
      </button>
    </form>
  );
}
