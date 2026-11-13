create table public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null check (email = lower(trim(email)) and position('@' in email) > 1),
  role public.app_role not null check (role in ('manager','bartender')),
  code uuid not null default gen_random_uuid() unique,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.organization_invitations enable row level security;
create policy invitations_owner on public.organization_invitations for all to authenticated
using(public.has_organization_role(organization_id, array['owner']::public.app_role[]))
with check(public.has_organization_role(organization_id, array['owner']::public.app_role[]));

create function public.accept_invitation(invitation_code uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare invite public.organization_invitations%rowtype; user_email text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select lower(email) into user_email from auth.users where id = auth.uid() and email_confirmed_at is not null;
  select * into invite from public.organization_invitations where code = invitation_code for update;
  if not found or invite.email is distinct from user_email or invite.expires_at < now() or invite.accepted_at is not null then
    raise exception 'Invitation is invalid, expired, already used, or addressed to a different email';
  end if;
  insert into public.organization_members(organization_id, user_id, role)
  values(invite.organization_id, auth.uid(), invite.role) on conflict do nothing;
  update public.organization_invitations set accepted_at = now() where id = invite.id;
  return invite.organization_id;
end;
$$;

-- All membership edits go through a function that preserves at least one owner.
drop policy members_manage_owner on public.organization_members;
revoke insert, update, delete on public.organization_members from anon, authenticated;
create function public.manage_team_member(target_organization_id uuid, target_user_id uuid, new_role public.app_role default null)
returns void language plpgsql security definer set search_path = '' as $$
declare old_role public.app_role;
begin
  perform 1 from public.organizations where id = target_organization_id for update;
  if not public.has_organization_role(target_organization_id, array['owner']::public.app_role[]) then raise exception 'Only owners can manage team members'; end if;
  select role into old_role from public.organization_members where organization_id = target_organization_id and user_id = target_user_id;
  if not found then raise exception 'Member not found'; end if;
  if old_role = 'owner' and new_role is distinct from 'owner' and
    (select count(*) from public.organization_members where organization_id = target_organization_id and role = 'owner') <= 1 then
    raise exception 'The last owner cannot be removed or demoted';
  end if;
  if new_role is null then
    delete from public.organization_members where organization_id = target_organization_id and user_id = target_user_id;
  else
    update public.organization_members set role = new_role where organization_id = target_organization_id and user_id = target_user_id;
  end if;
end;
$$;

create function public.team_members(target_organization_id uuid)
returns table(user_id uuid, email text, role public.app_role)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_organization_member(target_organization_id) then raise exception 'Not authorized'; end if;
  return query select m.user_id, u.email::text, m.role from public.organization_members m
  join auth.users u on u.id = m.user_id where m.organization_id = target_organization_id order by u.email;
end;
$$;

create function public.create_location(target_organization_id uuid, location_name text, location_timezone text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid;
begin
  if not public.has_organization_role(target_organization_id,array['owner']::public.app_role[]) then raise exception 'Only owners can create locations'; end if;
  if not exists(select 1 from pg_timezone_names where name = location_timezone) then raise exception 'Invalid timezone'; end if;
  insert into public.locations(organization_id,name,timezone) values(target_organization_id,trim(location_name),location_timezone) returning id into result;
  return result;
end;
$$;

create function public.daily_production_totals(target_location_id uuid, at_time timestamptz default now())
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare loc public.locations%rowtype; start_time timestamptz; end_time timestamptz; result jsonb;
begin
  select * into loc from public.locations where id = target_location_id;
  if not found then raise exception 'Location not found'; end if;
  start_time := date_trunc('day', at_time at time zone loc.timezone) at time zone loc.timezone;
  end_time := (date_trunc('day', at_time at time zone loc.timezone) + interval '1 day') at time zone loc.timezone;
  select jsonb_build_object('drinks',coalesce(sum(quantity),0),'events',count(*), 'day_start',start_time, 'day_end',end_time) into result
  from public.cocktail_productions where location_id = target_location_id and created_at >= start_time and created_at < end_time;
  return result;
end;
$$;

revoke all on function public.accept_invitation(uuid) from public;
revoke all on function public.manage_team_member(uuid,uuid,public.app_role) from public;
revoke all on function public.team_members(uuid) from public;
revoke all on function public.create_location(uuid,text,text) from public;
revoke all on function public.daily_production_totals(uuid,timestamptz) from public;
grant execute on function public.accept_invitation(uuid) to authenticated;
grant execute on function public.manage_team_member(uuid,uuid,public.app_role) to authenticated;
grant execute on function public.team_members(uuid) to authenticated;
grant execute on function public.create_location(uuid,text,text) to authenticated;
grant execute on function public.daily_production_totals(uuid,timestamptz) to authenticated;
