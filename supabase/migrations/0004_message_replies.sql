-- Message replies — turns the one-shot inquiry into a two-way conversation.
-- Run this in the Supabase SQL editor after 0003_messaging.sql.
--
-- 0003 built the tables thread-shaped on purpose, so this migration adds no tables
-- and no columns: it relaxes one foreign key, swaps in per-thread read marking, and
-- adds the function that lets either party post to an existing thread.
--
-- Safe to re-run: every statement is idempotent.

-- ============================================================================
-- Conversations outlive their listing
--
-- 0003 cascaded thread deletion from the listing, which meant a seller deleting a
-- sold item silently erased the discussion with whoever had been buying it. Now
-- the listing reference goes null instead and the thread survives; the UI renders
-- "item no longer available" for a null listing (it already did, for listings RLS
-- hides).
--
-- Nulls are distinct in a Postgres unique index, so message_threads_one_per_buyer
-- keeps working. Nothing can create a null-listing thread directly:
-- send_listing_message still requires an active listing.
-- ============================================================================

alter table public.message_threads
  alter column listing_id drop not null;

-- Dropping then adding is the idempotent way to change a foreign key's action.
alter table public.message_threads
  drop constraint if exists message_threads_listing_id_fkey;

alter table public.message_threads
  add constraint message_threads_listing_id_fkey
    foreign key (listing_id) references public.listings (id) on delete set null;

-- ============================================================================
-- Reply to an existing thread
--
-- Deliberately does NOT check the listing's status. A seller needs to be able to
-- answer "sorry, it just sold" *after* marking it sold, and blocking that would
-- cut the conversation off at exactly the moment it matters. Starting a *new*
-- thread still requires an active listing — see send_listing_message in 0003.
-- ============================================================================

create or replace function public.reply_to_thread(
  p_thread_id uuid,
  p_body      text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_body    text := btrim(coalesce(p_body, ''));
  v_message uuid;
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

  -- Both parties must still be active, matching what the select policy shows: you
  -- cannot post into a thread whose other side has been deactivated.
  if not public.is_thread_participant(p_thread_id) then
    raise exception 'thread is not available' using errcode = 'P0002';
  end if;

  insert into public.messages (thread_id, sender_id, body)
  values (p_thread_id, auth.uid(), v_body)
  returning id into v_message;

  update public.message_threads
     set last_message_at = now(),
         last_sender_id  = auth.uid()
   where id = p_thread_id;

  return v_message;
end;
$$;

-- ============================================================================
-- Per-thread read marking
--
-- Replaces mark_threads_read() from 0003, which stamped *every* thread at once.
-- That suited an inbox where the whole conversation was visible in the list; now
-- that reading happens on a thread page, marking everything read from the list
-- view would clear NEW pills for conversations the member never opened.
--
-- The old function is dropped rather than left in place: keeping it would leave a
-- one-line call that quietly discards unread state.
-- ============================================================================

create or replace function public.mark_thread_read(p_thread_id uuid)
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
   where id = p_thread_id
     and (buyer_id = auth.uid() or seller_id = auth.uid())
     and public.is_member();
$$;

drop function if exists public.mark_threads_read();

-- ============================================================================
-- Grants — see the note in 0003: CREATE FUNCTION grants EXECUTE to PUBLIC, which
-- would expose these at PostgREST's /rpc/ endpoint to the anon role.
-- ============================================================================

revoke all on function public.reply_to_thread(uuid, text) from public;
revoke all on function public.mark_thread_read(uuid) from public;

grant execute on function public.reply_to_thread(uuid, text) to authenticated;
grant execute on function public.mark_thread_read(uuid) to authenticated;
