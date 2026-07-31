-- Keep-alive — one row whose timestamp the daily cron bumps.
-- Run this in the Supabase SQL editor after 0004_message_replies.sql, and
-- BEFORE deploying the app code that calls record_keep_alive_ping().
--
-- Supabase pauses free projects after ~7 days without database activity. A
-- scheduler hits /api/cron/keep-alive once a day; this migration gives that
-- request something to do.
--
-- Why a write rather than a read: a select almost certainly counts as activity,
-- but "almost certainly" is a bad thing to bet a 7-day outage on, and a stored
-- timestamp is durable evidence the ping actually landed. The scheduler's own
-- dashboard can report 200 for a response that never reached Postgres — this
-- table cannot.
--
-- Safe to re-run: every statement is idempotent.

-- ============================================================================
-- Table
--
-- A singleton by construction: the primary key defaults to 1 and a check
-- constraint forbids any other value, so the table can never accumulate rows
-- however often it is pinged. There is nothing here to prune or vacuum down.
-- ============================================================================

create table if not exists public.keep_alive (
  id smallint primary key default 1,
  last_ping timestamptz not null default now(),
  constraint keep_alive_singleton check (id = 1)
);

insert into public.keep_alive (id) values (1) on conflict (id) do nothing;

-- ============================================================================
-- RLS
--
-- Select-only, and only for members — same shape as every other table here.
-- There is deliberately NO insert/update/delete policy: the function below is
-- the only way to write, which is the same reasoning 0003 applies to the
-- message tables. It also means the route needs no privileged key.
-- ============================================================================

alter table public.keep_alive enable row level security;

drop policy if exists keep_alive_select on public.keep_alive;
create policy keep_alive_select on public.keep_alive
  for select to authenticated
  using (public.is_member());

-- ============================================================================
-- The only write path
--
-- SECURITY DEFINER so it can update a table no role has write access to.
-- `set search_path = public` keeps the body from resolving names against a
-- caller-controlled path; auth.uid() is not used here, since the caller is a
-- cron job with no session at all.
-- ============================================================================

create or replace function public.record_keep_alive_ping()
returns timestamptz
language sql
security definer
set search_path = public
as $$
  update public.keep_alive
     set last_ping = now()
   where id = 1
  returning last_ping;
$$;

-- CREATE FUNCTION grants EXECUTE to PUBLIC by default, which would expose this
-- through /rpc/ to every role. Revoke, then grant only what is needed.
revoke all on function public.record_keep_alive_ping() from public;

-- anon, because the keep-alive route authenticates with the anon key rather than
-- the service-role key: an endpoint reachable without a session should not hold
-- one that bypasses RLS. The trade-off is that anyone with the (public) anon key
-- can call this — but the whole blast radius is setting one timestamp to now(),
-- which is indistinguishable from the keep-alive doing its job. So last_ping is
-- evidence that a ping happened, not proof of who sent it.
grant execute on function public.record_keep_alive_ping() to anon;
