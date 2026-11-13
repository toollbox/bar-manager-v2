import Link from "next/link";

import { requireWorkspace } from "@/data/workspace";
import { selectLocation, selectOrganization } from "@/app/settings/actions";

const controlClass =
  "h-11 min-w-0 rounded-xl border border-border bg-surface px-3 text-sm";

export async function WorkspaceNav() {
  const { supabase, locations, location, membership } =
    await requireWorkspace();
  const { data: organizations, error } = await supabase
    .from("organizations")
    .select("id,name")
    .order("created_at");
  if (error) throw new Error("Unable to load workspaces.");
  return (
    <div className="workspace-nav border-b border-border bg-surface px-6 py-3">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <nav
          aria-label="Workspace"
          className="flex flex-wrap gap-4 text-sm font-medium text-secondary"
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
            <Link className="hover:text-accent-strong" href={href} key={href}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-wrap gap-3">
          {organizations && organizations.length > 1 ? (
            <form
              action={selectOrganization}
              className="flex min-w-0 items-center gap-2 text-sm"
            >
              <label className="sr-only" htmlFor="organization">
                Current workspace
              </label>
              <select
                className={controlClass}
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
              <button
                className={`${controlClass} shrink-0 whitespace-nowrap font-semibold hover:bg-surface-muted`}
              >
                Change workspace
              </button>
            </form>
          ) : null}
          <form
            action={selectLocation}
            className="flex min-w-0 items-center gap-2 text-sm"
          >
            <label className="sr-only" htmlFor="location">
              Current location
            </label>
            <select
              className={controlClass}
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
            <button
              className={`${controlClass} shrink-0 whitespace-nowrap font-semibold hover:bg-surface-muted`}
            >
              Switch
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
