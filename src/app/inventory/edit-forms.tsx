"use client";

import { useActionState } from "react";
import {
  setCatalogActive,
  updateIngredient,
  updateProduct,
  type InventoryFormState,
} from "./actions";

const input =
  "mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm";
function Feedback({ state }: { state: InventoryFormState }) {
  return state.message ? (
    <p
      aria-live="polite"
      className={`mt-2 text-xs ${state.status === "error" ? "text-rose-700" : "text-emerald-700"}`}
    >
      {state.message}
    </p>
  ) : null;
}
export function ActiveForm({
  entity,
  id,
  active,
}: {
  entity: "ingredients" | "inventory_products";
  id: string;
  active: boolean;
}) {
  const [state, action, pending] = useActionState(
    setCatalogActive.bind(null, entity, id, !active),
    {} as InventoryFormState,
  );
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (
          active &&
          !confirm(
            "Archive this item? Its inventory and history will be preserved.",
          )
        )
          event.preventDefault();
      }}
    >
      <button
        className="mt-3 text-xs font-semibold text-amber-800 disabled:opacity-50"
        disabled={pending}
      >
        {active ? "Archive" : "Restore"}
      </button>
      <Feedback state={state} />
    </form>
  );
}
type Ingredient = {
  id: string;
  name: string;
  category: string;
  base_unit: string;
  image_url: string | null;
};
export function IngredientEditForm({ ingredient }: { ingredient: Ingredient }) {
  const [state, action, pending] = useActionState(
    updateIngredient.bind(null, ingredient.id),
    {} as InventoryFormState,
  );
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-xs font-semibold text-stone-600">
        Edit ingredient
      </summary>
      <form action={action} className="mt-3 space-y-2">
        <label className="block text-xs">
          Name
          <input
            className={input}
            defaultValue={ingredient.name}
            name="name"
            required
          />
        </label>
        <label className="block text-xs">
          Category
          <input
            className={input}
            defaultValue={ingredient.category}
            name="category"
            required
          />
        </label>
        <label className="block text-xs">
          Base unit
          <select
            className={input}
            defaultValue={ingredient.base_unit}
            name="baseUnit"
          >
            <option value="ml">ml</option>
            <option value="g">g</option>
            <option value="each">each</option>
          </select>
        </label>
        <label className="block text-xs">
          Image URL
          <input
            className={input}
            defaultValue={ingredient.image_url ?? ""}
            name="imageUrl"
            type="url"
          />
        </label>
        <button
          className="rounded-lg bg-stone-950 px-3 py-2 text-xs text-white"
          disabled={pending}
        >
          Save ingredient
        </button>
        <Feedback state={state} />
      </form>
      <ActiveForm active entity="ingredients" id={ingredient.id} />
    </details>
  );
}
type Product = {
  id: string;
  ingredient_id: string;
  brand: string;
  name: string;
  bottle_size: number | null;
  default_cost: number | null;
  image_url: string | null;
  reorderPoint: number;
  targetStock: number;
};
export function ProductEditForm({
  product,
  locationId,
}: {
  product: Product;
  locationId: string;
}) {
  const [state, action, pending] = useActionState(
    updateProduct.bind(null, product.id, product.ingredient_id),
    {} as InventoryFormState,
  );
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-xs font-semibold text-stone-500">
        Edit product & stock targets
      </summary>
      <form action={action} className="mt-3 grid max-w-xl grid-cols-2 gap-2">
        <input name="locationId" type="hidden" value={locationId} />
        <label className="text-xs">
          Brand
          <input
            className={input}
            defaultValue={product.brand}
            name="brand"
            required
          />
        </label>
        <label className="text-xs">
          Name
          <input
            className={input}
            defaultValue={product.name}
            name="name"
            required
          />
        </label>
        {(
          [
            ["bottleSize", "Package size", product.bottle_size],
            ["defaultCost", "Package cost", product.default_cost],
            ["reorderPoint", "Reorder at", product.reorderPoint],
            ["targetStock", "Target stock", product.targetStock],
          ] as const
        ).map(([name, label, value]) => (
          <label className="text-xs" key={name}>
            {label}
            <input
              className={input}
              defaultValue={value ?? ""}
              min={name === "bottleSize" ? "0.001" : "0"}
              name={name}
              step="0.001"
              type="number"
            />
          </label>
        ))}
        <label className="col-span-2 text-xs">
          Image URL
          <input
            className={input}
            defaultValue={product.image_url ?? ""}
            name="imageUrl"
            type="url"
          />
        </label>
        <button
          className="rounded-lg bg-stone-950 px-3 py-2 text-xs text-white"
          disabled={pending}
        >
          Save product
        </button>
        <div className="col-span-2">
          <Feedback state={state} />
        </div>
      </form>
      <ActiveForm active entity="inventory_products" id={product.id} />
    </details>
  );
}
