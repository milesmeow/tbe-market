-- In-app messaging — a member can send a note about a listing to whoever posted it.
-- Run this in the Supabase SQL editor (or via the Supabase CLI) after
-- 0002_member_deactivation.sql.
--
-- Messaging is an *additional* way to reach a seller, not a replacement: their email
-- and phone stay visible on the listing. There is no reply UI in this phase — the
-- seller reads the note and answers by email, phone, or in person.
--
-- The schema is thread-shaped even though the UI is one-shot, so adding a reply box
-- later is purely additive and needs no migration.
--
-- Safe to re-run: every statement is idempotent.

-- ============================================================================
-- Tables
-- ============================================================================

-- One thread per buyer per listing. seller_id is copied from the listing rather
-- than joined at read time so the RLS policy below is a plain column comparison;
-- that is safe because a listing's seller never changes (lib/types.ts omits
-- seller_id from the listings Update type, and no action writes it).
create table if not exists public.message_threads (
  id              uuid primary key default gen_random_uuid(),
  listing_id      uuid not null references public.listings (id) on delete cascade,
  buyer_id        uuid not null references public.profiles (id) on delete cascade,
  seller_id       uuid not null references public.profiles (id) on delete cascade,
  -- Who sent the most recent message. Unused while only buyers can send, but it is
  -- what stops the unread badge counting your *own* reply once replies exist.
  last_sender_id  uuid not null references public.profiles (id) on delete cascade,
  created_at      timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  -- Read state lives on the thread, not per message: fewer writes, and it is what a
  -- thread view will want later. Null means never read.
  buyer_read_at   timestamptz,
  seller_read_at  timestamptz,
  constraint message_threads_distinct_parties check (buyer_id <> seller_id),
  constraint message_threads_one_per_buyer unique (listing_id, buyer_id)
);

-- Messages are append-only. There is no update or delete path for them anywhere —
-- see the "Writes" section below for why that is enforced here rather than in the UI.
create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  thread_id  uuid not null references public.message_threads (id) on delete cascade,
  sender_id  uuid not null references public.profiles (id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now(),
  constraint messages_body_length
    check (char_length(btrim(body)) between 1 and 2000)
);

-- Inbox and "sent" both read threads by party, newest activity first.
create index if not exists message_threads_seller_idx
  on public.message_threads (seller_id, last_message_at desc);
create index if not exists message_threads_buyer_idx
  on public.message_threads (buyer_id, last_message_at desc);
create index if not exists messages_thread_idx
  on public.messages (thread_id, created_at);

-- ============================================================================
-- Helper: is the current user a party to this thread, with both parties active?
-- SECURITY DEFINER bypasses RLS inside the function, so the policy on
-- public.messages can consult public.message_threads without recursing into that
-- table's own policy once per row. Same reasoning as is_member() in 0001.
-- ============================================================================

create or replace function public.is_thread_participant(tid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.message_threads t
    where t.id = tid
      and (t.buyer_id = auth.uid() or t.seller_id = auth.uid())
      and public.is_active_member(t.buyer_id)
      and public.is_active_member(t.seller_id)
  );
$$;

-- ============================================================================
-- Row Level Security — reads
-- ============================================================================

alter table public.message_threads enable row level security;
alter table public.messages enable row level security;

-- Private to the two parties. Admins included: an admin can deactivate or remove an
-- abusive member without reading anyone's mail, so there is no policy granting them
-- access here.
--
-- The is_active_member() checks make deactivation consistent with listings_select in
-- 0002 — a deactivated member's conversations disappear for both sides, and
-- reactivating brings them back untouched.
drop policy if exists message_threads_select on public.message_threads;
create policy message_threads_select on public.message_threads
  for select to authenticated
  using (
    public.is_member()
    and (buyer_id = auth.uid() or seller_id = auth.uid())
    and public.is_active_member(buyer_id)
    and public.is_active_member(seller_id)
  );

drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages
  for select to authenticated
  using (
    public.is_member()
    and public.is_thread_participant(thread_id)
  );

-- ============================================================================
-- Writes — deliberately NO insert/update/delete policies on either table.
--
-- RLS cannot restrict *which columns* an update touches. An update policy loose
-- enough to let a recipient stamp seller_read_at would also let them rewrite
-- listing_id, or (with per-message read state) edit the body of a message someone
-- sent them. So every write goes through a SECURITY DEFINER function instead:
-- messages become append-only and read state is the only mutable field, enforced by
-- the function body rather than by trusting the client. RLS enabled with no write
-- policy denies those operations outright.
--
-- Same reasoning as the prevent_admin_escalation trigger in 0001.
-- ============================================================================

-- Send a message about a listing, creating the thread on first contact.
-- Returns the thread id. Raises on every failure so the caller cannot mistake a
-- rejected send for a successful one.
create or replace function public.send_listing_message(
  p_listing_id uuid,
  p_body       text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_body   text := btrim(coalesce(p_body, ''));
  v_seller uuid;
  v_thread uuid;
begin
  if auth.uid() is null or not public.is_member() then
    raise exception 'not an active member' using errcode = '42501';
  end if;

  if char_length(v_body) = 0 then
    raise exception 'message is empty' using errcode = '22023';
  end if;

  if char_length(v_body) > 2000 then
    raise exception 'message is too long' using errcode = '22023';
  end if;

  -- Only active listings from active sellers can be messaged. Reading seller_id here
  -- also means the caller cannot choose who receives the message.
  select l.seller_id into v_seller
    from public.listings l
   where l.id = p_listing_id
     and l.status = 'active'
     and public.is_active_member(l.seller_id);

  if v_seller is null then
    raise exception 'listing is not available' using errcode = 'P0002';
  end if;

  if v_seller = auth.uid() then
    raise exception 'cannot message your own listing' using errcode = '42501';
  end if;

  -- One thread per buyer per listing; a second note joins the existing thread.
  insert into public.message_threads (
    listing_id, buyer_id, seller_id, last_sender_id
  )
  values (p_listing_id, auth.uid(), v_seller, auth.uid())
  on conflict (listing_id, buyer_id) do update
    set last_message_at = now(),
        last_sender_id  = auth.uid()
  returning id into v_thread;

  insert into public.messages (thread_id, sender_id, body)
  values (v_thread, auth.uid(), v_body);

  return v_thread;
end;
$$;

-- Mark every thread the caller is a party to as read, on their own side only.
-- One statement so a single call covers both the buyer and seller roles.
create or replace function public.mark_threads_read()
returns void
language sql
security definer
set search_path = public
as $$
  update public.message_threads
     set seller_read_at = case
           when seller_id = auth.uid() then now() else seller_read_at end,
         buyer_read_at  = case
           when buyer_id  = auth.uid() then now() else buyer_read_at  end
   where (buyer_id = auth.uid() or seller_id = auth.uid())
     and public.is_member();
$$;

-- Threads with activity the caller has not seen, for the nav badge. Excludes
-- threads whose latest message the caller sent themselves.
create or replace function public.unread_thread_count()
returns integer
language sql
security definer
stable
set search_path = public
as $$
  select count(*)::int
    from public.message_threads t
   where public.is_member()
     and t.last_sender_id <> auth.uid()
     and public.is_active_member(t.buyer_id)
     and public.is_active_member(t.seller_id)
     and (
       (
         t.seller_id = auth.uid()
         and (t.seller_read_at is null or t.last_message_at > t.seller_read_at)
       )
       or (
         t.buyer_id = auth.uid()
         and (t.buyer_read_at is null or t.last_message_at > t.buyer_read_at)
       )
     );
$$;

-- ============================================================================
-- Grants
--
-- Supabase exposes every public-schema function at PostgREST's /rpc/ endpoint, and
-- CREATE FUNCTION grants EXECUTE to PUBLIC by default — which would let the anon
-- role call these. Their internal is_member() checks already reject anon, so this
-- locks a door that was locked; cheap defense in depth.
-- ============================================================================

revoke all on function public.is_thread_participant(uuid) from public;
revoke all on function public.send_listing_message(uuid, text) from public;
revoke all on function public.mark_threads_read() from public;
revoke all on function public.unread_thread_count() from public;

-- authenticated needs EXECUTE on the helper too: policies run it as the querying role.
grant execute on function public.is_thread_participant(uuid) to authenticated;
grant execute on function public.send_listing_message(uuid, text) to authenticated;
grant execute on function public.mark_threads_read() to authenticated;
grant execute on function public.unread_thread_count() to authenticated;
