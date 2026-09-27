"use client";

import { PackageCheck } from "lucide-react";
import { useActionState } from "react";

import { recordStockMovement, type InventoryFormState } from "@/app/inventory/actions";

export function ReceiveForm({ productId, locationId, suggestedQuantity, unit }: { productId: string; locationId: string; suggestedQuantity: number; unit: string }) {
  const [state, action, pending] = useActionState(recordStockMovement, {} as InventoryFormState);
  return <form action={action} className="mt-4">
    <input name="productId" type="hidden" value={productId} />
    <input name="locationId" type="hidden" value={locationId} />
    <input name="movementType" type="hidden" value="purchase" />
    <input name="correctionDirection" type="hidden" value="add" />
    <input name="notes" type="hidden" value="Received from purchase plan" />
    <div className="flex gap-2"><label className="sr-only" htmlFor={`receive-${productId}`}>Quantity received</label><div className="relative flex-1"><input className="w-full rounded-xl border border-stone-200 px-3 py-2.5 pr-12 text-sm" defaultValue={suggestedQuantity || ""} id={`receive-${productId}`} min="0.001" name="quantity" placeholder="Quantity" required step="0.001" type="number" /><span className="absolute right-3 top-2.5 text-xs text-stone-400">{unit}</span></div><button className="inline-flex items-center gap-1.5 rounded-xl bg-stone-950 px-4 text-sm font-semibold text-white disabled:opacity-50" disabled={pending}><PackageCheck size={16} />{pending ? "Saving…" : "Receive"}</button></div>
    {state.message ? <p className={`mt-2 text-xs ${state.status === "success" ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p> : null}
  </form>;
}
