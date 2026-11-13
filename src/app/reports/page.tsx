import Link from "next/link";
import { z } from "zod";
import { WorkspaceNav } from "@/components/workspace-nav";
import { requireWorkspace } from "@/data/workspace";
import { formatQuantity } from "@/domain/units";

type Report = {
  drinks: number;
  events: number;
  cocktails: { name: string; drinks: number }[];
  usage: { label: string; unit: string; quantity: number }[];
  history: {
    id: string;
    name: string;
    quantity: number;
    created_at: string;
    ingredients: {
      ingredient: string;
      product: string;
      quantity: number;
      unit: string;
    }[];
  }[];
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { supabase, location } = await requireWorkspace();
  const params = await searchParams;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: location.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const monthAgo = new Date(`${today}T12:00:00Z`);
  monthAgo.setUTCDate(monthAgo.getUTCDate() - 29);
  const parsed = z
    .object({
      from: z.iso.date(),
      through: z.iso.date(),
      page: z.coerce.number().int().min(1).max(100000),
    })
    .safeParse({
      from: params.from ?? monthAgo.toISOString().slice(0, 10),
      through: params.through ?? today,
      page: params.page ?? 1,
    });
  const valid =
    parsed.success &&
    parsed.data.through >= parsed.data.from &&
    Date.parse(parsed.data.through) - Date.parse(parsed.data.from) <=
      366 * 86400000;
  let report: Report | null = null;
  if (valid && parsed.success) {
    const { data, error } = await supabase.rpc("production_report", {
      target_location_id: location.id,
      from_date: parsed.data.from,
      through_date: parsed.data.through,
      page_number: parsed.data.page,
    });
    if (error) throw new Error("Unable to load production report.");
    report = data as unknown as Report;
  }
  const query = (page: number) =>
    `/reports?${new URLSearchParams({ from: parsed.success ? parsed.data.from : today, through: parsed.success ? parsed.data.through : today, page: String(page) })}`;
  return (
    <main className="min-h-screen bg-background">
      <WorkspaceNav />
      <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <div>
          <h1 className="text-3xl font-semibold">Production reports</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {location.name} · Dates and times use {location.timezone}.
          </p>
        </div>
        <form className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            From
            <input
              className="ml-2 rounded-lg border border-border bg-surface p-2"
              defaultValue={parsed.success ? parsed.data.from : today}
              name="from"
              required
              type="date"
            />
          </label>
          <label className="text-sm">
            Through
            <input
              className="ml-2 rounded-lg border border-border bg-surface p-2"
              defaultValue={parsed.success ? parsed.data.through : today}
              name="through"
              required
              type="date"
            />
          </label>
          <button className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">
            Run report
          </button>
        </form>
        {!valid ? (
          <p role="alert" className="text-sm text-danger">
            Choose a valid date range of at most 367 days.
          </p>
        ) : null}
        {report ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <article className="rounded-2xl bg-surface p-6">
                <p className="text-sm text-muted-foreground">Drinks produced</p>
                <p className="mt-2 text-3xl font-semibold">{report.drinks}</p>
              </article>
              <article className="rounded-2xl bg-surface p-6">
                <p className="text-sm text-muted-foreground">Production events</p>
                <p className="mt-2 text-3xl font-semibold">{report.events}</p>
              </article>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <section className="rounded-2xl bg-surface p-6">
                <h2 className="mb-4 font-semibold">Popular cocktails</h2>
                {report.cocktails.map((c) => (
                  <p className="flex justify-between py-2 text-sm" key={c.name}>
                    <span>{c.name}</span>
                    <span>{c.drinks}</span>
                  </p>
                ))}
              </section>
              <section className="rounded-2xl bg-surface p-6">
                <h2 className="mb-4 font-semibold">Product consumption</h2>
                {report.usage.map((p) => (
                  <p
                    className="flex justify-between gap-3 py-2 text-sm"
                    key={`${p.label}-${p.unit}`}
                  >
                    <span>{p.label}</span>
                    <span>{formatQuantity(p.quantity, p.unit)}</span>
                  </p>
                ))}
              </section>
            </div>
            <section className="rounded-2xl bg-surface p-6">
              <h2 className="mb-4 font-semibold">Production history</h2>
              {!report.events ? (
                <p className="text-sm text-muted-foreground">
                  No drinks recorded in this date range.
                </p>
              ) : null}
              <div className="divide-y divide-border-subtle">
                {report.history.map((event) => (
                  <details className="py-4" key={event.id}>
                    <summary className="cursor-pointer text-sm font-semibold">
                      {event.quantity} × {event.name}{" "}
                      <span className="ml-3 font-normal text-muted-foreground">
                        {new Date(event.created_at).toLocaleString("en-US", {
                          timeZone: location.timezone,
                        })}
                      </span>
                    </summary>
                    <ul className="mt-3 space-y-2 text-sm text-secondary">
                      {event.ingredients.map((i, index) => (
                        <li key={index}>
                          {i.ingredient}: {i.product} ·{" "}
                          {formatQuantity(i.quantity, i.unit)}
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
            </section>
            {parsed.success ? (
              <nav
                className="flex gap-4 text-sm font-semibold"
                aria-label="Report pages"
              >
                {parsed.data.page > 1 ? (
                  <Link href={query(parsed.data.page - 1)}>← Previous</Link>
                ) : null}
                <span>
                  Page {parsed.data.page} of{" "}
                  {Math.max(1, Math.ceil(report.events / 50))}
                </span>
                {parsed.data.page * 50 < report.events ? (
                  <Link href={query(parsed.data.page + 1)}>Next →</Link>
                ) : null}
              </nav>
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}
