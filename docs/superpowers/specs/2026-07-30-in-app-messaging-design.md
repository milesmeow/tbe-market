# In-app messaging for listings — design

**Date:** 2026-07-30
**Status:** approved, implementing

## Why

A buyer currently contacts a seller entirely off-platform. The listing detail page renders the
seller's `mailto:` and `tel:` links and the conversation leaves the app. In-app messaging was
explicitly excluded from v1 in `PLAN.md` ("Out of scope (v1) … in-app messaging"), so this
reverses a deliberate earlier decision.

Three goals, in the order they were given:

1. **Trust** — keep conversations inside the community rather than scattered across private
   inboxes.
2. **Convenience** — a form scoped to the item beats a blank `mailto:` draft, and the seller can
   see which item is being asked about.
3. **More ways to reach a seller** — messaging is an *additional* channel.

Goal 3 constrains everything else: **contact details stay visible.** This is not a privacy
feature and must not be built or described as one. Email and phone remain the fast path; the
in-app message is the casual one.

## Decisions

| Question | Decision | Reason |
| --- | --- | --- |
| Conversation model | One-shot inquiry UI, threads-shaped schema | Replies become purely additive later, with no migration. |
| Notification | In-app badge only | Resend is off, and its sandbox sender only delivers to the account owner. Real notification needs a verified domain and DNS access we may not have. |
| Admin visibility | None — private to the two parties | Acting on an abusive member (deactivate/remove, already built) does not require reading their mail. |
| Inbox | One `/messages` page, grouped by item, plus a Sent section | A single place the nav badge can point at. |

### Accepted consequence

A seller who does not log in for a week will not see a message for a week. Mitigated by keeping
email and phone visible, and by saying so in the compose form's helper text rather than implying
delivery is instant.

## Data model

`supabase/migrations/0003_messaging.sql`, applied after `0002_member_deactivation.sql`.

```
message_threads
  id              uuid pk
  listing_id      → listings(id)  on delete cascade
  buyer_id        → profiles(id)  on delete cascade
  seller_id       → profiles(id)  on delete cascade
  last_sender_id  → profiles(id)  on delete cascade
  created_at, last_message_at
  buyer_read_at, seller_read_at    -- null = never read
  check (buyer_id <> seller_id)
  unique (listing_id, buyer_id)    -- one thread per buyer per item

messages
  id         uuid pk
  thread_id  → message_threads(id) on delete cascade
  sender_id  → profiles(id)        on delete cascade
  body       text
  created_at
  check (char_length(btrim(body)) between 1 and 2000)
```

Three choices worth recording:

**`seller_id` is denormalized onto the thread.** It is derivable from `listings.seller_id`, but
copying it makes the RLS policy a column comparison instead of a join. Safe because a listing's
seller never changes: `lib/types.ts` omits `seller_id` from the `listings` `Update` type and no
action writes it.

**Read state is per thread, not per message** — two nullable timestamps. Fewer writes than a
`read_at` per row, and it is what a thread view will want in phase two anyway.

**`last_sender_id` exists for phase two.** Today only buyers send, so "unread" could mean simply
"the seller has not read it." Once either side can reply, the badge must not count your own
message as unread to you. One column now avoids a migration then.

## Security

Reads are governed by RLS; **writes have no policies at all** and go through
`SECURITY DEFINER` functions.

```sql
is_thread_participant(tid uuid)   -- SECURITY DEFINER, mirrors is_member()

message_threads_select: is_member()
                        and (buyer_id = auth.uid() or seller_id = auth.uid())
                        and is_active_member(buyer_id) and is_active_member(seller_id)

messages_select:        is_member() and is_thread_participant(thread_id)
```

`is_thread_participant` is `SECURITY DEFINER` for the reason `0001_init.sql` gives for
`is_member()`: a policy on `messages` that sub-selects the RLS-protected `message_threads` risks
recursion and pays a nested policy evaluation per row.

Including `is_active_member()` on both parties makes deactivation behave consistently with
`listings_select` in `0002` — a deactivated member's conversations disappear for everyone, and
reactivating restores them intact.

### Why writes are function-only

This is the load-bearing decision. Postgres RLS cannot restrict *which columns* an `UPDATE`
touches. Any update policy permissive enough to let a recipient stamp `seller_read_at` would
also let them rewrite `listing_id` — or, with per-message read state, edit the body of a message
someone sent *them*. Routing writes through functions makes messages append-only and read state
the only mutable field, enforced by the function body rather than by trusting the client. The
codebase already applies this reasoning in the `prevent_admin_escalation` trigger.

Three functions:

```sql
send_listing_message(p_listing_id uuid, p_body text) returns uuid
mark_threads_read() returns void
unread_thread_count() returns integer
```

`send_listing_message` validates: caller is an active member; the listing exists, is `active`,
and its seller is an active member; the sender is not the seller; the body is non-empty after
trimming and at most 2000 characters. It then upserts the thread
(`on conflict (listing_id, buyer_id) do update … returning id`), inserts the message, and bumps
`last_message_at` and `last_sender_id`.

Each function is `revoke all … from public` then `grant execute … to authenticated`. Supabase
exposes every `public`-schema function through PostgREST's `/rpc/` endpoint and `CREATE FUNCTION`
grants `EXECUTE` to `PUBLIC` by default, which would let the **anon** role call them. Their
internal `is_member()` checks would reject anon anyway, so this locks a door that was already
locked — cheap defense in depth.

## UI

**Compose** — `components/MessageSellerForm.tsx`, a client component using `useActionState` with
`SubmitButton` and `FormError` from `components/ui.tsx`, following `ProfileForm`. It sits inside
the existing "Contact the seller" box on the listing detail page, *below* the email and phone
links, so it reads as a third option rather than a replacement. Hidden when the viewer owns the
listing or the listing is sold. Helper text sets expectations: *"They'll see this next time they
visit the marketplace. For a faster reply, email or call."* On success the textarea is replaced
by a confirmation rather than silently cleared.

**Inbox** — `app/(app)/messages/page.tsx`. Received threads grouped by listing, newest first,
each showing the sender's name, their contact details (there is no reply UI, so the seller needs
them to respond), the message body, and a relative timestamp. A `NEW` pill marks threads where
`last_message_at > seller_read_at`. A Sent section lists what you have sent.

**Marking read** — the new/unread flags are computed from the timestamps *before* anything is
cleared, then `after(() => markThreadsRead())` from `next/server` runs post-response. This shape
is required, not stylistic: Next's `data-security.md` forbids mutations as a render side-effect,
and `after()` is the sanctioned escape hatch for work that should not block the response. No
client component and no `useEffect`. The visit that reveals a message still highlights it.

**Badge** — `Messages (2)` in the authenticated nav, one `unread_thread_count()` RPC. The layout
already reads cookies and queries `profiles`, so it is dynamic and the count is always fresh.

**Queries** live in `lib/messages.ts`, mirroring `lib/listings.ts`, so pages stay declarative and
each RPC gets one typed wrapper.

## Edge cases

- **Member removal needs no code change.** `profiles` → `message_threads` → `messages` cascades,
  and unlike photos there is no object storage to orphan, so `deleteMember` is untouched. To be
  verified, not assumed.
- Listing deletion cascades identically.
- React escapes message bodies, so rendering with `whitespace-pre-wrap` is XSS-safe.
- A GET to `/messages` clearing your own badge through `after()` is the one non-POST side effect.
  Forging it gains an attacker nothing beyond clearing the victim's own badge.
- The migration must be applied **before** deploying code that reads the new tables — PostgREST
  returns 400 for unknown columns, and `CLAUDE.md` documents the resulting lockout hazard.

## Out of scope

Reply UI, email notifications, admin visibility, block and report, rate limiting, attachments,
realtime updates. Rate limiting specifically: the community is small and invite-only, and the
2000-character cap plus one-thread-per-buyer-per-item already blunt the obvious abuse.

## Verification

Static gates (`tsc`, `lint`, `test`, `build`) never exercise RLS, so the security claims need
manual checks against the live database:

- **Cross-member read:** as an unrelated member, query another pair's thread id through
  PostgREST. Must return empty — the database refuses it, not the UI.
- **Write path:** a direct PostgREST `insert` into `messages` must fail, since no insert policy
  exists.
- **Round trip:** B messages A's item → A's badge reads 1 → A opens `/messages` and sees it
  flagged `NEW` with B's contact details → reload, badge 0 → deactivate B, the thread vanishes
  for A → reactivate, it returns intact.
- Owner sees no compose form on their own listing; sold listings show none either.
- Remove a member and confirm their threads and messages are gone.

Unit tests cover the pure helpers in `lib/messages.ts` (body validation, grouping by listing)
alongside the existing `lib/format.test.ts`.
