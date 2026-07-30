-- Member deactivation — a reversible alternative to removing a member.
-- Run this in the Supabase SQL editor (or via the Supabase CLI) after 0001_init.sql.
--
-- Deactivating keeps every row: the profile, their listings, and their photos all
-- stay put, so reactivating restores the member exactly as they were. What it
-- takes away is access (they can no longer sign in, read, or post) and visibility
-- (their listings disappear from the marketplace for everyone else).
--
-- Safe to re-run: every statement is idempotent.

-- ============================================================================
-- Column: when the member was deactivated (null = active)
-- ============================================================================

-- A timestamp rather than a boolean, so the dashboard also records *when*.
alter table public.profiles
  add column if not exists deactivated_at timestamptz;

-- Speeds up the seller-visibility check below, which runs per listing row.
create index if not exists profiles_active_idx
  on public.profiles (id) where deactivated_at is null;

-- ============================================================================
-- Helper: is a given user an active member?
-- SECURITY DEFINER bypasses RLS inside the function, so policies can call it
-- without triggering nested policy evaluation on public.profiles.
-- ============================================================================

create or replace function public.is_active_member(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = uid and deactivated_at is null
  );
$$;

-- Redefined in terms of the helper. This is the load-bearing change: every
-- select/insert policy in 0001 already routes through is_member(), so a
-- deactivated member loses read and write access to the whole app at once.
create or replace function public.is_member()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_active_member(auth.uid());
$$;

-- ============================================================================
-- Policy updates
-- ============================================================================

-- Let a user always read their own profile row, even when deactivated. Without
-- this, is_member() being false would hide the row from its own owner, and the
-- login screen could not tell "deactivated" apart from "never was a member".
-- Permissive policies OR together, so this only widens select — to your own data.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = auth.uid());

-- Hide a deactivated member's listings from the marketplace. Their rows survive
-- untouched; they just stop being selectable, so the grid, detail pages, and the
-- embedded-images join all skip them until the member is reactivated.
drop policy if exists listings_select on public.listings;
create policy listings_select on public.listings
  for select to authenticated
  using (
    public.is_member()
    and public.is_active_member(seller_id)
  );

-- 0001 gated these on ownership alone, which left a deactivated member able to
-- keep editing their own rows. Adding is_member() closes that at the database,
-- and is a no-op for active members.
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid() and public.is_member())
  with check (id = auth.uid() and public.is_member());

drop policy if exists listings_update_own on public.listings;
create policy listings_update_own on public.listings
  for update to authenticated
  using (seller_id = auth.uid() and public.is_member())
  with check (seller_id = auth.uid() and public.is_member());

drop policy if exists listings_delete_own on public.listings;
create policy listings_delete_own on public.listings
  for delete to authenticated
  using (seller_id = auth.uid() and public.is_member());
