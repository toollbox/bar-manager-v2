"use client";

import { Plus, Save } from "lucide-react";
import { useActionState, useMemo, useState } from "react";

import {
  addRecipeLine,
  createCocktail,
  updateCocktail,
  type CocktailFormState,
} from "@/app/cocktails/actions";

const initialState: CocktailFormState = {};
const inputClass = "mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10";

function Message({ state }: { state: CocktailFormState }) {
  if (!state.message) return null;
  return <p aria-live="polite" className={`rounded-xl px-3.5 py-2.5 text-sm ${state.status === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{state.message}</p>;
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
  return <>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-medium text-stone-700">Name<input className={inputClass} defaultValue={values.name} name="name" placeholder="Margarita" required /></label>
      <label className="text-sm font-medium text-stone-700">Glassware<input className={inputClass} defaultValue={values.glassware ?? ""} name="glassware" placeholder="Coupe" /></label>
    </div>
    <label className="block text-sm font-medium text-stone-700">Short description<input className={inputClass} defaultValue={values.description ?? ""} maxLength={500} name="description" placeholder="Bright, tart, and refreshing" /></label>
    <label className="block text-sm font-medium text-stone-700">Instructions<textarea className={inputClass} defaultValue={values.instructions} name="instructions" placeholder="Shake with ice and strain…" required rows={3} /></label>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-medium text-stone-700">Garnish<input className={inputClass} defaultValue={values.garnish ?? ""} name="garnish" placeholder="Lime wheel" /></label>
      <label className="text-sm font-medium text-stone-700">External image URL<input className={inputClass} defaultValue={values.image_url ?? ""} name="imageUrl" placeholder="https://…" type="url" /></label>
    </div>
  </>;
}

export function CocktailCreateForm() {
  const [state, action, pending] = useActionState(createCocktail, initialState);
  return <form action={action} className="space-y-4"><Fields />{state.errors ? <p className="text-sm text-rose-600">Check the cocktail details.</p> : null}<Message state={state} /><button className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold hover:bg-amber-400 disabled:opacity-60" disabled={pending}><Plus size={17} />{pending ? "Creating…" : "Create cocktail"}</button></form>;
}

export function CocktailEditForm({ cocktail }: { cocktail: Required<Pick<CocktailValues, "id" | "name" | "instructions">> & CocktailValues }) {
  const action = useMemo(() => updateCocktail.bind(null, cocktail.id), [cocktail.id]);
  const [state, formAction, pending] = useActionState(action, initialState);
  return <form action={formAction} className="space-y-4"><Fields values={cocktail} />{state.errors ? <p className="text-sm text-rose-600">Check the cocktail details.</p> : null}<Message state={state} /><button className="inline-flex items-center gap-2 rounded-xl bg-stone-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-60" disabled={pending}><Save size={16} />{pending ? "Saving…" : "Save details"}</button></form>;
}

type Ingredient = { id: string; name: string; base_unit: "ml" | "g" | "each" };
type Product = { id: string; ingredient_id: string; brand: string; name: string };

export function RecipeLineForm({ cocktailId, ingredients, products }: { cocktailId: string; ingredients: Ingredient[]; products: Product[] }) {
  const [state, action, pending] = useActionState(addRecipeLine, initialState);
  const [ingredientId, setIngredientId] = useState(ingredients[0]?.id ?? "");
  const [policy, setPolicy] = useState("any_product");
  const matchingProducts = products.filter((product) => product.ingredient_id === ingredientId);
  const unit = ingredients.find((ingredient) => ingredient.id === ingredientId)?.base_unit ?? "ml";
  return <form action={action} className="space-y-3 rounded-xl bg-stone-50 p-4">
    <input name="cocktailId" type="hidden" value={cocktailId} />
    <div className="grid gap-3 md:grid-cols-3">
      <label className="text-xs font-semibold text-stone-600">Ingredient<select className={inputClass} name="ingredientId" onChange={(event) => setIngredientId(event.target.value)} required value={ingredientId}>{ingredients.map((ingredient) => <option key={ingredient.id} value={ingredient.id}>{ingredient.name}</option>)}</select></label>
      <label className="text-xs font-semibold text-stone-600">Brand rule<select className={inputClass} name="selectionPolicy" onChange={(event) => setPolicy(event.target.value)} value={policy}><option value="any_product">Any available brand</option><option value="prefer_product">Prefer a brand</option><option value="require_product">Require a brand</option></select></label>
      <label className="text-xs font-semibold text-stone-600">Amount ({unit})<input className={inputClass} min="0.001" name="quantityInBaseUnit" required step="0.001" type="number" /></label>
    </div>
    {policy === "any_product" ? <input name="preferredProductId" type="hidden" value="" /> : <label className="block text-xs font-semibold text-stone-600">{policy === "require_product" ? "Required product" : "Preferred product"}<select className={inputClass} name="preferredProductId" required><option value="">Select a matching product</option>{matchingProducts.map((product) => <option key={product.id} value={product.id}>{product.brand} {product.name}</option>)}</select>{matchingProducts.length === 0 ? <span className="mt-1 block font-normal text-amber-700">Add a branded product for this ingredient first.</span> : null}</label>}
    <label className="block text-xs font-semibold text-stone-600">Recipe note <span className="font-normal text-stone-400">(optional)</span><input className={inputClass} name="notes" placeholder="Freshly squeezed, chilled…" /></label>
    <Message state={state} />
    <button className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-stone-100 disabled:opacity-60" disabled={pending || ingredients.length === 0}><Plus size={16} />{pending ? "Adding…" : "Add ingredient"}</button>
  </form>;
}
