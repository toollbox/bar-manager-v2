"use client";

import { CheckCircle2, ChevronDown, CircleAlert, Search } from "lucide-react";
import { useState, type ReactNode } from "react";

type ServiceDrink = {
  id: string;
  name: string;
  canMake: boolean;
  searchText: string;
  baseSpirits: { id: string; name: string }[];
  thumbnail: ReactNode;
  details: ReactNode;
};

function normalizeSearch(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export function ServiceMenu({ drinks }: { drinks: ServiceDrink[] }) {
  const [search, setSearch] = useState("");
  const [baseSpirit, setBaseSpirit] = useState("");
  const spirits = Array.from(
    new Map(
      drinks.flatMap((drink) =>
        drink.baseSpirits.map((spirit) => [spirit.id, spirit] as const),
      ),
    ).values(),
  ).sort((a, b) => a.name.localeCompare(b.name));
  const terms = normalizeSearch(search).trim().split(/\s+/).filter(Boolean);
  const matches = (drink: ServiceDrink) =>
    terms.every((term) => normalizeSearch(drink.searchText).includes(term)) &&
    (!baseSpirit ||
      (baseSpirit === "none"
        ? drink.baseSpirits.length === 0
        : drink.baseSpirits.some((spirit) => spirit.id === baseSpirit)));
  const resultCount = drinks.filter(matches).length;

  return (
    <section aria-label="Service menu" className="mt-8">
      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <label className="flex-1 text-xs font-semibold text-stone-600">
            Search drinks
            <div className="relative mt-1.5">
              <Search
                aria-hidden="true"
                className="absolute left-3 top-3 text-stone-400"
                size={18}
              />
              <input
                className="w-full rounded-xl border border-stone-200 py-2.5 pl-10 pr-3 text-sm font-normal"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name, ingredient, or brand…"
                type="search"
                value={search}
              />
            </div>
          </label>
          <label className="text-xs font-semibold text-stone-600 sm:w-52">
            Base spirit
            <select
              className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-normal"
              onChange={(event) => setBaseSpirit(event.target.value)}
              value={baseSpirit}
            >
              <option value="">All base spirits</option>
              {spirits.map((spirit) => (
                <option key={spirit.id} value={spirit.id}>
                  {spirit.name}
                </option>
              ))}
              {drinks.some((drink) => drink.baseSpirits.length === 0) ? (
                <option value="none">No spirit ingredient</option>
              ) : null}
            </select>
          </label>
          {search || baseSpirit ? (
            <button
              className="rounded-xl px-3 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-100"
              onClick={() => {
                setSearch("");
                setBaseSpirit("");
              }}
              type="button"
            >
              Clear filters
            </button>
          ) : null}
        </div>
        <p aria-live="polite" className="mt-3 text-xs text-stone-500">
          {resultCount} of {drinks.length} drinks · Click a card to see the
          recipe and pour options.
        </p>
      </div>
      <div className="mt-5 grid items-start gap-3 lg:grid-cols-2">
        {drinks.map((drink) => (
          <article
            className={`overflow-hidden rounded-2xl border bg-white ${drink.canMake ? "border-emerald-200" : "border-stone-200"}`}
            hidden={!matches(drink)}
            key={drink.id}
          >
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center gap-3 p-3 hover:bg-stone-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-amber-600 [&::-webkit-details-marker]:hidden">
                {drink.thumbnail}
                <h2 className="min-w-0 flex-1 font-semibold">{drink.name}</h2>
                {drink.canMake ? (
                  <CheckCircle2
                    aria-label="Available"
                    className="shrink-0 text-emerald-600"
                    size={18}
                  />
                ) : (
                  <CircleAlert
                    aria-label="Unavailable"
                    className="shrink-0 text-amber-600"
                    size={18}
                  />
                )}
                <ChevronDown
                  aria-hidden="true"
                  className="shrink-0 text-stone-400 transition-transform group-open:rotate-180"
                  size={18}
                />
              </summary>
              {drink.details}
            </details>
          </article>
        ))}
      </div>
      {resultCount === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center">
          <p className="font-semibold">No matching drinks</p>
          <p className="mt-1 text-sm text-stone-500">
            Try a different search or clear the filters.
          </p>
        </div>
      ) : null}
    </section>
  );
}
