import Link from "next/link";

import { requireWorkspace } from "@/data/workspace";
import { selectLocation, selectOrganization } from "@/app/settings/actions";

export async function WorkspaceNav() {
  const { supabase, locations, location, membership } =
    await requireWorkspace();
  const { data: organizations, error } = await supabase
    .from("organizations")
    .select("id,name")
    .order("created_at");
  if (error) throw new Error("Unable to load workspaces.");
  return (
    <div className="border-b border-stone-200 bg-white px-6 py-3">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <nav
          aria-label="Workspace"
          className="flex flex-wrap gap-4 text-sm font-medium text-stone-600"
        >
          {[
            ["Dashboard", "/dashboard"],
            ["Service", "/service"],
            ["Cocktails", "/cocktails"],
            ["Inventory", "/inventory"],
            ["Purchasing", "/purchasing"],
            ["Reports", "/reports"],
            ["Settings", "/settings"],
          ].map(([label, href]) => (
            <Link className="hover:text-amber-700" href={href} key={href}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-wrap gap-3">
          {organizations && organizations.length > 1 ? (
            <form
              action={selectOrganization}
              className="flex items-center gap-2"
            >
              <label className="sr-only" htmlFor="organization">
                Current workspace
              </label>
              <select
                className="rounded-lg border border-stone-200 px-2 py-1 text-sm"
                defaultValue={membership.organization_id}
                id="organization"
                name="organizationId"
              >
                {organizations.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <button className="rounded-lg border border-stone-200 px-2 py-1 text-xs font-semibold">
                Change workspace
              </button>
            </form>
          ) : null}
          <form action={selectLocation} className="flex items-center gap-2">
            <label className="sr-only" htmlFor="location">
              Current location
            </label>
            <select
              className="rounded-lg border border-stone-200 px-2 py-1 text-sm"
              defaultValue={location.id}
              id="location"
              name="locationId"
            >
              {locations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <button className="rounded-lg border border-stone-200 px-2 py-1 text-xs font-semibold">
              Switch
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
