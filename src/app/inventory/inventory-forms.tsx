"use client";

import { ArrowDownToLine, Plus, Tag } from "lucide-react";
import { useActionState, useState } from "react";
import { QuantityField } from "@/components/quantity-field";
import {
  formatStockQuantity,
  resolveStockUnit,
  unitLabel,
} from "@/domain/units";
import { InventoryMeasurements } from "./inventory-measurements";
import { BaseUnitSelect } from "./base-unit-select";
import { CategorySelect } from "./category-select";

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
  default_unit: string;
};

const initialState: InventoryFormState = {};
const inputClass =
  "mt-1.5 h-11 w-full min-w-0 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10";

function Message({ state }: { state: InventoryFormState }) {
  if (!state.message) return null;
  return (
    <p
      className={`rounded-xl px-3.5 py-2.5 text-sm ${
        state.status === "success"
          ? "bg-success-soft text-success"
          : "bg-danger-soft text-danger"
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
  stockUnit: string;
};

export function IngredientForm({ categories = [] }: { categories?: string[] }) {
  const [state, action, pending] = useActionState(
    createIngredient,
    initialState,
  );

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-secondary">
          Ingredient name
          <input
            className={inputClass}
            name="name"
            placeholder="Vodka"
            required
          />
        </label>
        <label className="text-sm font-medium text-secondary">
          Category
          <CategorySelect className={inputClass} categories={categories} />
        </label>
      </div>
      <label className="block text-sm font-medium text-secondary">
        Base unit
        <BaseUnitSelect className={inputClass} />
      </label>
      <label className="block text-sm font-medium text-secondary">
        Default image URL{" "}
        <span className="font-normal text-muted-foreground">(optional)</span>
        <input
          className={inputClass}
          name="imageUrl"
          placeholder="https://…"
          type="url"
        />
      </label>
      {state.errors ? (
        <p className="text-sm text-danger">Check the ingredient details.</p>
      ) : null}
      <Message state={state} />
      <button
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
        disabled={pending}
      >
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
  const [ingredientId, setIngredientId] = useState("");
  const unit =
    ingredients.find((ingredient) => ingredient.id === ingredientId)
      ?.base_unit ?? "ml";

  return (
    <form
      action={action}
      className="space-y-4"
      onReset={() => setIngredientId("")}
    >
      <input name="locationId" type="hidden" value={locationId} />
      <label className="block text-sm font-medium text-secondary">
        Generic ingredient
        <select
          className={inputClass}
          name="ingredientId"
          onChange={(event) => setIngredientId(event.target.value)}
          required
          value={ingredientId}
        >
          <option value="">Select an ingredient</option>
          {ingredients.map((ingredient) => (
            <option key={ingredient.id} value={ingredient.id}>
              {ingredient.name} · {unitLabel(ingredient.default_unit)}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-secondary">
          Brand
          <input
            className={inputClass}
            name="brand"
            placeholder="Smirnoff"
            required
          />
        </label>
        <label className="text-sm font-medium text-secondary">
          Product name
          <input
            className={inputClass}
            name="name"
            placeholder="No. 21 Vodka"
            required
          />
        </label>
      </div>
      <label className="block text-sm font-medium text-secondary">
        Product image URL{" "}
        <span className="font-normal text-muted-foreground">(optional)</span>
        <input
          className={inputClass}
          name="imageUrl"
          placeholder="https://…"
          type="url"
        />
      </label>
      <div className="text-sm font-medium text-secondary">
        <InventoryMeasurements
          key={ingredientId}
          baseUnit={unit}
          stockUnit={
            ingredients.find((ingredient) => ingredient.id === ingredientId)
              ?.default_unit
          }
          openingQuantity={0}
          inputClass={inputClass}
        />
      </div>
      {state.errors ? (
        <p className="text-sm text-danger">
          Check all values. Target stock cannot be below the reorder point.
        </p>
      ) : null}
      <Message state={state} />
      <button
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground hover:bg-accent-hover disabled:opacity-60"
        disabled={pending || ingredients.length === 0}
      >
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
    <form
      action={action}
      className={`grid items-end gap-4 sm:grid-cols-2 ${movementType === "correction" ? "xl:grid-cols-[repeat(5,minmax(0,1fr))_auto]" : "lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]"}`}
      onReset={() => {
        setProductId(products[0]?.id ?? "");
        setMovementType("purchase");
      }}
    >
      <input name="locationId" type="hidden" value={locationId} />
      <label className="min-w-0 text-sm font-medium text-secondary">
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
              {product.label} ·{" "}
              {formatStockQuantity(
                product.quantity,
                product.unit,
                product.stockUnit,
              )}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium text-secondary">
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
        <label className="text-sm font-medium text-secondary">
          Direction
          <select className={inputClass} name="correctionDirection">
            <option value="add">Add</option>
            <option value="remove">Remove</option>
          </select>
        </label>
      ) : (
        <input name="correctionDirection" type="hidden" value="add" />
      )}
      <div className="text-sm font-medium text-secondary">
        <QuantityField
          key={productId}
          label="Quantity"
          name="quantity"
          baseUnit={selectedProduct?.unit ?? "ml"}
          defaultUnit={resolveStockUnit(
            selectedProduct?.unit ?? "ml",
            selectedProduct?.stockUnit,
          )}
          showConversion={false}
          min={0.001}
          placeholder="750"
          required
          inputClass={inputClass}
        />
      </div>
      <label className="text-sm font-medium text-secondary">
        Note
        <input
          className={inputClass}
          maxLength={1000}
          name="notes"
          placeholder="Delivery, reason…"
        />
      </label>
      <button
        className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
        disabled={pending || products.length === 0}
      >
        <ArrowDownToLine size={17} /> {pending ? "Saving…" : "Record"}
      </button>
      <div className="col-span-full">
        {state.errors ? (
          <p className="text-sm text-danger">
            Select a product and enter a positive quantity.
          </p>
        ) : null}
        <Message state={state} />
      </div>
    </form>
  );
}
