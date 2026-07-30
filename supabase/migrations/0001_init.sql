-- Community Marketplace — initial schema, RLS, storage, triggers.
-- Run this in the Supabase SQL editor (or via the Supabase CLI) on the new project.

-- ============================================================================
-- Tables
-- ============================================================================

create table if not exists public.profiles (
  id                   uuid primary key references auth.users (id) on delete cascade,
  display_name         text,
  contact_email        text,
  contact_phone        text,
  is_admin             boolean not null default false,
  must_change_password boolean not null default true,
  created_at           timestamptz not null default now()
);

create table if not exists public.listings (
  id          uuid primary key default gen_random_uuid(),
  seller_id   uuid not null references public.profiles (id) on delete cascade,
  title       text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  status      text not null default 'active' check (status in ('active', 'sold')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.listing_images (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references public.listings (id) on delete cascade,
  storage_path text not null,
  position    integer not null default 0
);

create index if not exists listings_seller_id_idx on public.listings (seller_id);
create index if not exists listings_status_created_idx on public.listings (status, created_at desc);
create index if not exists listing_images_listing_id_idx on public.listing_images (listing_id);

-- ============================================================================
-- Helper: is the current user a member (has a profile row)?
-- SECURITY DEFINER bypasses RLS inside the function, avoiding recursion.
-- ============================================================================

create or replace function public.is_member()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

-- ============================================================================
-- Trigger: keep updated_at fresh on listings
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists listings_set_updated_at on public.listings;
create trigger listings_set_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Trigger: prevent members from promoting themselves to admin
-- ============================================================================

create or replace function public.prevent_admin_escalation()
returns trigger
language plpgsql
as $$
begin
  if new.is_admin is distinct from old.is_admin
     and coalesce(auth.role(), '') <> 'service_role' then
    new.is_admin := old.is_admin;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_admin_escalation on public.profiles;
create trigger profiles_prevent_admin_escalation
  before update on public.profiles
  for each row execute function public.prevent_admin_escalation();

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;

-- profiles: members can read all profiles; users can update only their own.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (public.is_member());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- listings: members read all; owners write their own.
drop policy if exists listings_select on public.listings;
create policy listings_select on public.listings
  for select to authenticated
  using (public.is_member());

drop policy if exists listings_insert_own on public.listings;
create policy listings_insert_own on public.listings
  for insert to authenticated
  with check (seller_id = auth.uid() and public.is_member());

drop policy if exists listings_update_own on public.listings;
create policy listings_update_own on public.listings
  for update to authenticated
  using (seller_id = auth.uid())
  with check (seller_id = auth.uid());

drop policy if exists listings_delete_own on public.listings;
create policy listings_delete_own on public.listings
  for delete to authenticated
  using (seller_id = auth.uid());

-- listing_images: members read all; owners write images on their own listings.
drop policy if exists listing_images_select on public.listing_images;
create policy listing_images_select on public.listing_images
  for select to authenticated
  using (public.is_member());

drop policy if exists listing_images_insert_own on public.listing_images;
create policy listing_images_insert_own on public.listing_images
  for insert to authenticated
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.seller_id = auth.uid()
    )
  );

drop policy if exists listing_images_delete_own on public.listing_images;
create policy listing_images_delete_own on public.listing_images
  for delete to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.seller_id = auth.uid()
    )
  );

-- ============================================================================
-- Storage bucket for listing photos (public read, member-only write)
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

drop policy if exists listing_images_storage_insert on storage.objects;
create policy listing_images_storage_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'listing-images' and public.is_member());

drop policy if exists listing_images_storage_delete on storage.objects;
create policy listing_images_storage_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'listing-images' and owner = auth.uid());
