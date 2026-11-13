import { WorkspaceNav } from "@/components/workspace-nav";
import { requireWorkspace } from "@/data/workspace";
import {
  AcceptInvitationForm,
  InvitationForm,
  LocationForm,
  MemberForm,
} from "./settings-forms";

export default async function SettingsPage() {
  const { supabase, membership, locations } = await requireWorkspace();
  const { data: members, error } = await supabase.rpc("team_members", {
    target_organization_id: membership.organization_id,
  });
  if (error) throw new Error("Unable to load team members.");
  const owner = membership.role === "owner";
  return (
    <main className="min-h-screen bg-[#f5f3ee]">
      <WorkspaceNav />
      <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <h1 className="text-3xl font-semibold">Workspace settings</h1>
        <section className="rounded-2xl border border-stone-200 bg-white p-6">
          <h2 className="mb-4 font-semibold">Team members</h2>
          <div className="divide-y divide-stone-100">
            {members?.map((member) => (
              <div
                className="flex flex-wrap items-center justify-between gap-3 py-4"
                key={member.user_id}
              >
                <p className="text-sm">{member.email}</p>
                {owner ? (
                  <MemberForm role={member.role} userId={member.user_id} />
                ) : (
                  <span className="text-sm text-stone-500">{member.role}</span>
                )}
              </div>
            ))}
          </div>
          {owner ? (
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-semibold">Invite a teammate</h3>
              <InvitationForm />
            </div>
          ) : null}
        </section>
        <section className="rounded-2xl border border-stone-200 bg-white p-6">
          <h2 className="mb-4 font-semibold">Locations</h2>
          <ul className="mb-5 space-y-2 text-sm">
            {locations.map((location) => (
              <li key={location.id}>
                {location.name}{" "}
                <span className="text-stone-500">· {location.timezone}</span>
              </li>
            ))}
          </ul>
          {owner ? <LocationForm /> : null}
        </section>
        <section className="rounded-2xl border border-stone-200 bg-white p-6">
          <h2 className="mb-4 font-semibold">Accept a workspace invitation</h2>
          <AcceptInvitationForm />
        </section>
      </div>
    </main>
  );
}
