-- Limit Supabase's default grants as well as row access policies.
revoke all on public.user_preferences from public, anon, authenticated;
grant select, insert, update on public.user_preferences to authenticated;
