"use client";

import { Plus, Tag } from "lucide-react";
import { useActionState } from "react";

import {
  createIngredient,
  createInventoryProduct,
  type InventoryFormState,
} from "@/app/inventory/actions";

type Ingredient = {
  id: string;
  name: string;
  base_unit: "ml" | "g" | "each";
};

const initialState: InventoryFormState = {};
const inputClass =
  "mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10";

function Message({ state }: { state: InventoryFormState }) {
  if (!state.message) return null;
  return (
    <p
      className={`rounded-xl px-3.5 py-2.5 text-sm ${
        state.status === "success"
          ? "bg-emerald-50 text-emerald-700"
          : "bg-rose-50 text-rose-700"
      }`}
    >
      {state.message}
    </p>
  );
}

export function IngredientForm() {
  const [state, action, pending] = useActionState(createIngredient, initialState);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-stone-700">
          Ingredient name
          <input className={inputClass} name="name" placeholder="Vodka" required />
        </label>
        <label className="text-sm font-medium text-stone-700">
          Category
          <input className={inputClass} name="category" placeholder="Spirit" required />
        </label>
      </div>
      <label className="block text-sm font-medium text-stone-700">
        Base unit
        <select className={inputClass} defaultValue="ml" name="baseUnit">
          <option value="ml">Milliliters (ml)</option>
          <option value="g">Grams (g)</option>
          <option value="each">Each</option>
        </select>
      </label>
      {state.errors ? (
        <p className="text-sm text-rose-600">Check the ingredient details.</p>
      ) : null}
      <Message state={state} />
      <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-stone-950 px-4 py-3 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-60" disabled={pending}>
        <Plus size={17} /> {pending ? "Creating…" : "Create ingredient"}
      </button>
    </form>
  );
}

export function ProductForm({
  ingredients,
  locationId,
}: {
  ingredients: Ingredient[];
  locationId: string;
}) {
  const [state, action, pending] = useActionState(
    createInventoryProduct,
    initialState,
  );

  return (
    <form action={action} className="space-y-4">
      <input name="locationId" type="hidden" value={locationId} />
      <label className="block text-sm font-medium text-stone-700">
        Generic ingredient
        <select className={inputClass} name="ingredientId" required>
          <option value="">Select an ingredient</option>
          {ingredients.map((ingredient) => (
            <option key={ingredient.id} value={ingredient.id}>
              {ingredient.name} · {ingredient.base_unit}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-stone-700">
          Brand
          <input className={inputClass} name="brand" placeholder="Smirnoff" required />
        </label>
        <label className="text-sm font-medium text-stone-700">
          Product name
          <input className={inputClass} name="name" placeholder="No. 21 Vodka" required />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm font-medium text-stone-700">
          Bottle size
          <input className={inputClass} min="0.001" name="bottleSize" placeholder="750" step="0.001" type="number" />
        </label>
        <label className="text-sm font-medium text-stone-700">
          Opening stock
          <input className={inputClass} defaultValue="0" min="0" name="openingQuantity" step="0.001" type="number" />
        </label>
        <label className="text-sm font-medium text-stone-700">
          Bottle cost
          <input className={inputClass} min="0" name="defaultCost" placeholder="18.99" step="0.01" type="number" />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-stone-700">
          Reorder point
          <input className={inputClass} defaultValue="0" min="0" name="reorderPoint" step="0.001" type="number" />
        </label>
        <label className="text-sm font-medium text-stone-700">
          Target stock
          <input className={inputClass} defaultValue="0" min="0" name="targetStock" step="0.001" type="number" />
        </label>
      </div>
      {state.errors ? (
        <p className="text-sm text-rose-600">
          Check all values. Target stock cannot be below the reorder point.
        </p>
      ) : null}
      <Message state={state} />
      <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-stone-950 hover:bg-amber-400 disabled:opacity-60" disabled={pending || ingredients.length === 0}>
        <Tag size={17} /> {pending ? "Adding…" : "Add branded product"}
      </button>
    </form>
  );
}
