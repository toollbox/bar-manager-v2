"use client";

import { PackageCheck } from "lucide-react";
import { useActionState } from "react";

import {
  recordStockMovement,
  type InventoryFormState,
} from "@/app/inventory/actions";
import { QuantityField } from "@/components/quantity-field";
import { resolveStockUnit, type BaseUnit } from "@/domain/units";

export function ReceiveForm({
  productId,
  locationId,
  suggestedQuantity,
  unit,
  stockUnit,
}: {
  productId: string;
  locationId: string;
  suggestedQuantity: number;
  unit: BaseUnit;
  stockUnit: string;
}) {
  const [state, action, pending] = useActionState(
    recordStockMovement,
    {} as InventoryFormState,
  );
  return (
    <form action={action} className="mt-4">
      <input name="productId" type="hidden" value={productId} />
      <input name="locationId" type="hidden" value={locationId} />
      <input name="movementType" type="hidden" value="purchase" />
      <input name="correctionDirection" type="hidden" value="add" />
      <input name="notes" type="hidden" value="Received from purchase plan" />
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 text-xs font-semibold text-secondary">
          <QuantityField
            label="Quantity received"
            name="quantity"
            baseUnit={unit}
            defaultUnit={resolveStockUnit(unit, stockUnit)}
            showConversion={false}
            defaultValue={suggestedQuantity || undefined}
            min={0.001}
            placeholder="Quantity"
            required
            inputClass="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-normal"
          />
        </div>
        <button
          className="mt-5 inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          disabled={pending}
        >
          <PackageCheck size={16} />
          {pending ? "Saving…" : "Receive"}
        </button>
      </div>
      {state.message ? (
        <p
          className={`mt-2 text-xs ${state.status === "success" ? "text-success" : "text-danger"}`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
