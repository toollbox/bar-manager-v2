"use client";

import { useEffect, useRef, useState } from "react";
import {
  formatQuantity,
  fromBaseQuantity,
  toBaseQuantity,
  type BaseUnit,
  type InputUnit,
} from "@/domain/units";

export function QuantityField({
  label,
  name,
  unitName = `${name}Unit`,
  baseUnit,
  defaultValue,
  required = false,
  min = 0,
  placeholder,
  inputClass,
  defaultUnit = baseUnit,
  selectedUnit,
  showConversion = true,
  preserveEnteredAmount = false,
}: {
  label: string;
  name: string;
  unitName?: string;
  baseUnit: BaseUnit;
  defaultValue?: number | null;
  required?: boolean;
  min?: number;
  placeholder?: string;
  inputClass: string;
  defaultUnit?: InputUnit;
  selectedUnit?: InputUnit;
  showConversion?: boolean;
  preserveEnteredAmount?: boolean;
}) {
  const initial = defaultValue == null ? "" : String(defaultValue);
  const [draft, setDraft] = useState({
    initial,
    amount: initial,
    unit: baseUnit as InputUnit,
  });
  const [unitChoice, setUnitChoice] = useState({
    defaultUnit,
    unit: defaultUnit,
  });
  const ref = useRef<HTMLInputElement>(null);
  // React actions reset forms after success. Keep both controlled fields and
  // the conversion preview in sync with that reset.
  useEffect(() => {
    const form = ref.current?.form;
    function reset() {
      setDraft({ initial, amount: initial, unit: baseUnit });
      setUnitChoice({ defaultUnit, unit: defaultUnit });
    }
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, [initial, baseUnit, defaultUnit]);
  const unit =
    unitChoice.defaultUnit === defaultUnit ? unitChoice.unit : defaultUnit;
  const effectiveUnit = selectedUnit ?? (baseUnit === "ml" ? unit : baseUnit);
  const current =
    draft.initial === initial ? draft : { amount: initial, unit: baseUnit };
  const baseAmount =
    current.amount === ""
      ? NaN
      : toBaseQuantity(
          Number(current.amount),
          preserveEnteredAmount ? effectiveUnit : current.unit,
          baseUnit,
        );
  const amount =
    current.amount === ""
      ? ""
      : preserveEnteredAmount || current.unit === effectiveUnit
        ? current.amount
        : String(fromBaseQuantity(baseAmount, effectiveUnit, baseUnit));

  return (
    <div className="min-w-0">
      <div className="flex items-end gap-2">
        <label className="min-w-0 flex-1">
          {label}
          <input
            aria-label={label}
            className={inputClass}
            min={min}
            name={name}
            onChange={(event) =>
              setDraft({
                initial,
                amount: event.target.value,
                unit: effectiveUnit,
              })
            }
            placeholder={placeholder}
            ref={ref}
            required={required}
            step="any"
            type="number"
            value={amount}
          />
        </label>
        {baseUnit === "ml" && selectedUnit === undefined ? (
          <label className="w-24 shrink-0">
            <span className="sr-only">{label} unit</span>
            <select
              aria-label={`${label} unit`}
              className={inputClass}
              name={unitName}
              onChange={(event) => {
                setUnitChoice({
                  defaultUnit,
                  unit: event.target.value as InputUnit,
                });
              }}
              value={effectiveUnit}
            >
              <option value="ml">ml</option>
              <option value="fl_oz">fl oz (US)</option>
            </select>
          </label>
        ) : (
          <>
            <input name={unitName} type="hidden" value={effectiveUnit} />
            <span className="pb-2.5 text-xs font-normal text-muted-foreground">
              {effectiveUnit === "fl_oz" ? "fl oz" : effectiveUnit}
            </span>
          </>
        )}
      </div>
      {showConversion && Number.isFinite(baseAmount) && baseUnit === "ml" ? (
        <p className="mt-1 text-xs font-normal text-muted-foreground">
          {formatQuantity(baseAmount, baseUnit)}
        </p>
      ) : null}
    </div>
  );
}
