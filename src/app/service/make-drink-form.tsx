"use client";

import { Check, Martini } from "lucide-react";
import { useActionState, useState } from "react";

import { makeCocktail, type ProductionState } from "@/app/service/actions";
import type { LineAvailability } from "@/domain/availability";
import { resolveServiceSelections } from "@/domain/service-selection";

const initialState: ProductionState = {};

export function MakeDrinkForm({
  cocktailId,
  locationId,
  maxServings,
  lines,
  requestId,
}: {
  cocktailId: string;
  locationId: string;
  maxServings: number;
  lines: LineAvailability[];
  requestId: string;
}) {
  const [quantity, setQuantity] = useState(1);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [showMessage, setShowMessage] = useState(true);
  const [state, action, pending] = useActionState(
    async (previous: ProductionState, formData: FormData) => {
      setShowMessage(false);
      const result = await makeCocktail(previous, formData);
      if (result.status === "success") {
        setChoices({});
        setQuantity(1);
      }
      setShowMessage(true);
      return result;
    },
    initialState,
  );
  const { selections, canSubmit } = resolveServiceSelections(
    lines,
    quantity,
    choices,
  );

  return (
    <form
      action={action}
      className="border-t border-stone-100 bg-stone-50 p-5"
      onSubmit={(event) => {
        if (!canSubmit || pending) event.preventDefault();
      }}
      onReset={(event) => event.preventDefault()}
    >
      <input name="cocktailId" type="hidden" value={cocktailId} />
      <input name="requestId" type="hidden" value={requestId} />
      <input name="locationId" type="hidden" value={locationId} />
      <input
        name="selections"
        type="hidden"
        value={JSON.stringify(selections)}
      />
      <div className="flex items-end gap-3">
        <label className="w-28 text-xs font-semibold text-stone-600">
          Quantity
          <input
            className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm"
            max={Math.min(maxServings, 100)}
            min="1"
            name="quantity"
            disabled={pending}
            required
            step="1"
            onChange={(event) => {
              setQuantity(Number(event.target.value));
              setShowMessage(false);
            }}
            type="number"
            value={quantity}
          />
        </label>
        <p className="pb-2.5 text-xs text-stone-500">
          Choose the exact product poured:
        </p>
      </div>
      <div className="mt-3 space-y-3">
        {lines.map((line) => (
          <label
            className="block text-xs font-semibold text-stone-600"
            key={line.lineId}
          >
            {line.ingredientName} ·{" "}
            {(line.required * quantity).toLocaleString()} {line.unit}
            <select
              className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-normal"
              disabled={pending}
              required
              onChange={(event) => {
                setShowMessage(false);
                setChoices((current) => ({
                  ...current,
                  [line.lineId]: event.target.value,
                }));
              }}
              value={selections[line.lineId]}
            >
              <option value="">Select product</option>
              {line.products.map((product) => {
                const enough = product.quantity >= line.required * quantity;
                return (
                  <option
                    disabled={!enough}
                    key={product.id}
                    value={product.id}
                  >
                    {product.label} · {product.quantity.toLocaleString()}{" "}
                    {line.unit}
                    {enough ? "" : " · insufficient"}
                  </option>
                );
              })}
            </select>
          </label>
        ))}
      </div>
      {!canSubmit ? (
        <p className="mt-3 text-xs text-stone-500">
          Choose a product for every ingredient and a valid quantity to make
          this drink.
        </p>
      ) : null}
      {showMessage && state.message ? (
        <p
          aria-live="polite"
          className={`mt-3 rounded-xl px-3 py-2.5 text-sm ${state.status === "success" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-700"}`}
        >
          {state.status === "success" ? (
            <Check className="mr-1.5 inline" size={15} />
          ) : null}
          {state.message}
        </p>
      ) : null}
      <button
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-stone-950 px-4 py-3 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
        disabled={pending || !canSubmit}
      >
        <Martini size={17} />
        {pending
          ? "Recording…"
          : `Make ${quantity} drink${quantity === 1 ? "" : "s"}`}
      </button>
    </form>
  );
}
