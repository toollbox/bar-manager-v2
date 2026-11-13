"use client";

import { useActionState } from "react";
import { InventoryMeasurements } from "./inventory-measurements";
import type { BaseUnit } from "@/domain/units";
import { BaseUnitSelect } from "./base-unit-select";
import { CategorySelect } from "./category-select";
import {
  setCatalogActive,
  updateIngredient,
  updateProduct,
  type InventoryFormState,
} from "./actions";

const input =
  "mt-1 h-11 w-full min-w-0 rounded-lg border border-border bg-surface px-3 py-2 text-sm";
function Feedback({ state }: { state: InventoryFormState }) {
  return state.message ? (
    <p
      aria-live="polite"
      className={`mt-2 text-xs ${state.status === "error" ? "text-danger" : "text-success"}`}
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
        className="mt-3 text-xs font-semibold text-accent-strong disabled:opacity-50"
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
  default_unit: string;
  image_url: string | null;
};
export function IngredientEditForm({
  ingredient,
  categories = [],
}: {
  ingredient: Ingredient;
  categories?: string[];
}) {
  const [state, action, pending] = useActionState(
    updateIngredient.bind(null, ingredient.id),
    {} as InventoryFormState,
  );
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-xs font-semibold text-secondary">
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
          <CategorySelect
            className={input}
            defaultValue={ingredient.category}
            categories={categories}
          />
        </label>
        <label className="block text-xs">
          Base unit
          <BaseUnitSelect
            className={input}
            defaultValue={ingredient.default_unit}
          />
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
          className="rounded-lg bg-primary px-3 py-2 text-xs text-primary-foreground"
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
  stock_unit: string;
  image_url: string | null;
  reorderPoint: number;
  targetStock: number;
};
export function ProductEditForm({
  product,
  locationId,
  baseUnit,
}: {
  product: Product;
  locationId: string;
  baseUnit: BaseUnit;
}) {
  const [state, action, pending] = useActionState(
    updateProduct.bind(null, product.id, product.ingredient_id),
    {} as InventoryFormState,
  );
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">
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
        <div className="col-span-2 text-xs">
          <InventoryMeasurements
            editing
            baseUnit={baseUnit}
            stockUnit={product.stock_unit}
            bottleSize={product.bottle_size}
            reorderPoint={product.reorderPoint}
            targetStock={product.targetStock}
            inputClass={input}
          />
        </div>
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
          className="rounded-lg bg-primary px-3 py-2 text-xs text-primary-foreground"
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
