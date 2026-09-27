"use client";

import { ArrowDownToLine, Plus, Tag } from "lucide-react";
import { useActionState, useState } from "react";

import {
  createIngredient,
  createInventoryProduct,
  recordStockMovement,
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

type StockProduct = {
  id: string;
  label: string;
  unit: "ml" | "g" | "each";
  quantity: number;
};

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
      <label className="block text-sm font-medium text-stone-700">
        Default image URL <span className="font-normal text-stone-400">(optional)</span>
        <input className={inputClass} name="imageUrl" placeholder="https://…" type="url" />
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
      <label className="block text-sm font-medium text-stone-700">
        Product image URL <span className="font-normal text-stone-400">(optional)</span>
        <input className={inputClass} name="imageUrl" placeholder="https://…" type="url" />
      </label>
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

export function StockMovementForm({
  products,
  locationId,
}: {
  products: StockProduct[];
  locationId: string;
}) {
  const [state, action, pending] = useActionState(
    recordStockMovement,
    initialState,
  );
  const [movementType, setMovementType] = useState("purchase");
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const selectedProduct = products.find((product) => product.id === productId);

  return (
    <form action={action} className="grid gap-4 lg:grid-cols-[1.3fr_1fr_0.7fr_1.4fr_auto] lg:items-end">
      <input name="locationId" type="hidden" value={locationId} />
      <label className="text-sm font-medium text-stone-700">
        Product
        <select
          className={inputClass}
          name="productId"
          onChange={(event) => setProductId(event.target.value)}
          required
          value={productId}
        >
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.label} · {product.quantity.toLocaleString()} {product.unit}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium text-stone-700">
        Operation
        <select
          className={inputClass}
          name="movementType"
          onChange={(event) => setMovementType(event.target.value)}
          value={movementType}
        >
          <option value="purchase">Receive stock</option>
          <option value="waste">Record waste</option>
          <option value="spill">Record spill</option>
          <option value="correction">Correction</option>
        </select>
      </label>
      {movementType === "correction" ? (
        <label className="text-sm font-medium text-stone-700">
          Direction
          <select className={inputClass} name="correctionDirection">
            <option value="add">Add</option>
            <option value="remove">Remove</option>
          </select>
        </label>
      ) : (
        <input name="correctionDirection" type="hidden" value="add" />
      )}
      <label className="text-sm font-medium text-stone-700">
        Quantity {selectedProduct ? `(${selectedProduct.unit})` : ""}
        <input className={inputClass} min="0.001" name="quantity" placeholder="750" required step="0.001" type="number" />
      </label>
      <label className="text-sm font-medium text-stone-700">
        Note
        <input className={inputClass} maxLength={1000} name="notes" placeholder="Delivery, reason…" />
      </label>
      <button
        className="flex h-[42px] items-center justify-center gap-2 rounded-xl bg-stone-950 px-5 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-60"
        disabled={pending || products.length === 0}
      >
        <ArrowDownToLine size={17} /> {pending ? "Saving…" : "Record"}
      </button>
      <div className="lg:col-span-5">
        {state.errors ? (
          <p className="text-sm text-rose-600">Select a product and enter a positive quantity.</p>
        ) : null}
        <Message state={state} />
      </div>
    </form>
  );
}
