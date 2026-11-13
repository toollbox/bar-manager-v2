"use client";

import { useEffect, useRef, useState } from "react";
import { QuantityField } from "@/components/quantity-field";
import {
  resolveStockUnit,
  type BaseUnit,
  type InputUnit,
} from "@/domain/units";

export function InventoryMeasurements({
  baseUnit,
  stockUnit,
  bottleSize,
  openingQuantity,
  reorderPoint = 0,
  targetStock = 0,
  inputClass,
  editing = false,
}: {
  baseUnit: BaseUnit;
  stockUnit?: string | null;
  bottleSize?: number | null;
  openingQuantity?: number;
  reorderPoint?: number;
  targetStock?: number;
  inputClass: string;
  editing?: boolean;
}) {
  const savedUnit = resolveStockUnit(baseUnit, stockUnit);
  const [choice, setChoice] = useState({ savedUnit, unit: savedUnit });
  const unit = choice.savedUnit === savedUnit ? choice.unit : savedUnit;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const form = ref.current?.closest("form");
    const reset = () => setChoice({ savedUnit, unit: savedUnit });
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, [savedUnit]);
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" ref={ref}>
      <QuantityField
        label={editing ? "Package size" : "Bottle size"}
        name="bottleSize"
        baseUnit={baseUnit}
        defaultValue={bottleSize}
        min={0.001}
        selectedUnit={unit}
        preserveEnteredAmount={!editing}
        showConversion={false}
        inputClass={inputClass}
      />
      <label>
        Stock unit
        <select
          aria-label="Stock unit"
          className={inputClass}
          name="stockUnit"
          onChange={(event) =>
            setChoice({ savedUnit, unit: event.target.value as InputUnit })
          }
          value={unit}
        >
          {baseUnit === "ml" ? (
            <>
              <option value="ml">ml</option>
              <option value="fl_oz">fl oz (US)</option>
            </>
          ) : (
            <option value={baseUnit}>
              {baseUnit === "g" ? "g (grams)" : "each"}
            </option>
          )}
        </select>
      </label>
      {openingQuantity !== undefined ? (
        <QuantityField
          label="Opening stock"
          name="openingQuantity"
          baseUnit={baseUnit}
          defaultValue={openingQuantity}
          required
          selectedUnit={unit}
          preserveEnteredAmount={!editing}
          showConversion={false}
          inputClass={inputClass}
        />
      ) : null}
      <QuantityField
        label={editing ? "Reorder at" : "Reorder point"}
        name="reorderPoint"
        baseUnit={baseUnit}
        defaultValue={reorderPoint}
        required
        selectedUnit={unit}
        preserveEnteredAmount={!editing}
        showConversion={false}
        inputClass={inputClass}
      />
      <QuantityField
        label="Target stock"
        name="targetStock"
        baseUnit={baseUnit}
        defaultValue={targetStock}
        required
        selectedUnit={unit}
        preserveEnteredAmount={!editing}
        showConversion={false}
        inputClass={inputClass}
      />
    </div>
  );
}
