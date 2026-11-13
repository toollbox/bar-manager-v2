"use client";
import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { deleteRecipeLine, type CocktailFormState } from "./actions";

export function RemoveLineForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(
    deleteRecipeLine,
    {} as CocktailFormState,
  );
  return (
    <form action={action}>
      <input name="id" type="hidden" value={id} />
      <button
        aria-label="Remove recipe ingredient"
        className="rounded-lg p-2 text-stone-400 hover:bg-rose-50 hover:text-rose-700"
        disabled={pending}
      >
        <Trash2 size={15} />
      </button>
      {state.message ? (
        <p aria-live="polite" className="text-xs text-rose-700">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
