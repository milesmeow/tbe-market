# Community Market — Build Plan & Progress

Living checklist for the invite-only community marketplace. Update the boxes as
work lands. See [README.md](README.md) for setup details and the original design
brief for full context.

**Stack:** Next.js 16 (App Router) + React 19 + Tailwind v4 · Supabase (Postgres,
Auth, Storage) · Resend (email) · Vercel (hosting). All free tier.

**Status legend:** `[x]` done · `[~]` in progress · `[ ]` not started ·
`[!]` blocked on you (needs your accounts/keys)

---

## Pick up here (handoff)

**State as of 2026-07-30:** MVP is feature-complete and `release/1.0.1` is merged into
both `main` and `develop`, so `main` now carries the app. Invites work **without email**:
the admin invite screen shows the new member's sign-in details to copy and share by hand
(Resend stays unconfigured for the testing phase). **In-app messaging (Phase 10) is built
but not yet live** — its migration has not been applied. All automated checks pass
(`tsc`, `lint`, `build`, `31/31` tests).

**Blocked on James (not on code):**
1. Turn **off** public signups in Supabase (Auth → Providers → Email) — do before inviting.
2. **Run `0003_messaging.sql`** in the SQL editor. Until then `/messages` is empty and the
   nav badge reads 0 — deliberately degraded rather than broken, but the feature is inert.
3. Create the **Vercel** project, add env vars, deploy, then set `APP_URL` to the assigned
   domain and redeploy.

**Suggested next action for a fresh session:** apply `0003`, walk the messaging checks in
Verification, then walk the End-to-end checklist against the production URL — especially
multi-photo iPhone uploads and the free / no-photo listing renders. Read
[README.md](README.md) for setup and
[AGENTS.md](AGENTS.md) before touching Next.js code (this repo pins Next 16 with
breaking changes vs. older docs).

---

## Phase 1 — Scaffold ✅
- [x] Next.js + TypeScript + Tailwind project
- [x] Supabase clients: [browser](lib/supabase/client.ts), [server](lib/supabase/server.ts), [admin](lib/supabase/admin.ts)
- [x] [`lib/config.ts`](lib/config.ts) (APP_NAME, constants) + [`lib/types.ts`](lib/types.ts)
- [x] Node version pinned ([.nvmrc](.nvmrc), `engines` in package.json)

## Phase 2 — Database ✅
- [x] Migration written: [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) — tables, RLS, storage bucket, triggers
- [x] Migration written: [`0002_member_deactivation.sql`](supabase/migrations/0002_member_deactivation.sql) — `deactivated_at`, `is_active_member()`, policy updates
- [ ] **Run `0002_member_deactivation.sql`** in the SQL editor — required before this code runs
- [x] Admin seed script: [`supabase/seed_admin.sql`](supabase/seed_admin.sql)
- [x] New marketplace Supabase project created (Data API + auto-expose + automatic RLS enabled)
- [x] Ran `0001_init.sql` in the new project's SQL editor
- [x] Seeded admin user (created auth user, ran `seed_admin.sql`)
- [ ] Turn off public signups (Auth → Providers → Email) — recommended, do before inviting

## Phase 3 — Auth ✅
- [x] Session refresh + route protection: [`proxy.ts`](proxy.ts) + [`lib/supabase/middleware.ts`](lib/supabase/middleware.ts)
- [x] [Login page + action](app/login/page.tsx)
- [x] [Forced first-login password change](app/auth/change-password/page.tsx)

## Phase 4 — Member admin ✅
- [x] [Invite flow + member list](app/(app)/admin/invite/page.tsx) ([actions](app/(app)/admin/invite/actions.ts))
- [x] Resend transactional invite email (code in place; disabled by unset env vars)
- [x] Email-optional fallback: credentials shown in the admin UI for manual sharing
- [x] Remove a member (hard delete: account, listings, photos) — admins exempt
- [x] Deactivate / reactivate a member (reversible: keeps data, revokes access) — admins exempt
- [ ] Resend account + verified domain — deferred until after the testing phase

## Phase 5 — Listings ✅
- [x] Create with multi-photo upload ([new](app/(app)/listings/new/page.tsx) + [actions](app/(app)/listings/actions.ts))
- [x] [Detail page + photo gallery](app/(app)/listings/[id]/page.tsx)
- [x] [Edit / delete / mark Sold](app/(app)/listings/[id]/edit/page.tsx), remove individual photos
- [x] [Home grid](app/(app)/page.tsx) with Sold badges + empty state
- [x] Photos **optional**; free items supported (price shows "Free")
- [x] Browser-side image pipeline: HEIC→JPEG + resize/compress ([lib/image.ts](lib/image.ts))

## Phase 6 — Profile + contact ✅
- [x] [Profile editor](app/(app)/profile/page.tsx) (display name + contact email/phone)
- [x] Seller contact rendered on listing detail (members only)

## Phase 7 — Polish ✅
- [x] Header/nav with APP_NAME ([app layout](app/(app)/layout.tsx)), sign out
- [x] Responsive grid, empty/loading/error states, form validation
- [x] Shared UI primitives ([components/ui.tsx](components/ui.tsx), cards, forms)

## Phase 8 — Deploy 🚧
- [x] Copy `.env.local.example` → `.env.local`, fill in keys (running locally)
- [x] Pushed to GitHub (`milesmeow/tbe-market`)
- [ ] Fast-forward `main` to `develop`, push
- [ ] `vercel link`, add env vars (omit `RESEND_API_KEY` / `EMAIL_FROM`)
- [ ] Deploy, set `APP_URL` to the assigned domain, redeploy

## Phase 9 — Post-MVP refinements ✅
- [x] Client-side image compression (resize ~1600px, JPEG) — [lib/image.ts](lib/image.ts)
- [x] HEIC/HEIF (iPhone) → JPEG conversion via `heic2any` (lazy-loaded)
- [x] Raised Server Action body limit to 4 MB — [next.config.ts](next.config.ts)
- [x] Resilient image preview (placeholder for non-web formats) — [components/ListingForm.tsx](components/ListingForm.tsx)
- [x] Photos optional when posting
- [x] "This item is free" checkbox → `price_cents = 0`, displays as "Free"

## Phase 10 — In-app messaging 🚧
Design: [docs/superpowers/specs/2026-07-30-in-app-messaging-design.md](docs/superpowers/specs/2026-07-30-in-app-messaging-design.md)
- [x] Migration written: [`0003_messaging.sql`](supabase/migrations/0003_messaging.sql) — `message_threads`, `messages`, RLS, three `SECURITY DEFINER` functions
- [ ] **Run `0003_messaging.sql`** in the SQL editor — required before this code runs
- [x] Query layer [`lib/messages.ts`](lib/messages.ts) + [tests](lib/messages.test.ts)
- [x] Compose form on the listing page — [components/MessageSellerForm.tsx](components/MessageSellerForm.tsx)
- [x] Unread badge in the authenticated nav
- [x] `vitest.config.ts` so tests resolve the `@/*` path alias

### Phase 10b — Replies (two-way conversations)
- [x] Migration written: [`0004_message_replies.sql`](supabase/migrations/0004_message_replies.sql) — `reply_to_thread()`, `mark_thread_read()`, listing FK `cascade` → `set null`
- [ ] **Run `0004_message_replies.sql`** in the SQL editor
- [x] Conversation list at [`/messages`](<app/(app)/messages/page.tsx>) — flat, both roles, newest first
- [x] Thread page [`/messages/[id]`](<app/(app)/messages/[id]/page.tsx>) with full history + [reply box](components/ReplyForm.tsx)
- [x] First message from a listing redirects into the new thread

---

## Verification

### Automated (done) ✅
- [x] `npx tsc --noEmit` — passes
- [x] `npm run lint` — passes
- [x] `npm run build` — passes
- [x] `npm test` — 31/31 passing ([format](lib/format.test.ts), [messages](lib/messages.test.ts))

### Local (in progress) 🚧
- [x] Admin logs in locally against the live Supabase project
- [x] Posts a listing (photo upload working after HEIC + compression fixes)
- [ ] Verify free + no-photo listings render correctly

### End-to-end (run against the deployed URL) 🚧
- [ ] Admin invites a test member → credentials block renders, member row appears
- [ ] Member logs in → forced to change-password → sets new password
- [ ] Member sets contact info; posts a listing with 2–3 photos
- [ ] Second member sees the listing + seller contact; non-member sees nothing
- [ ] Owner edits, marks Sold (badge shows), deletes
- [ ] RLS check: a member cannot edit/delete another member's listing
- [ ] Repeat smoke test against the deployed Vercel URL

**Messaging (Phase 10) — needs `0003` and `0004` applied first:**
- [x] Member B messages A's item → A can read it
- [ ] Sending redirects B into the new thread
- [ ] A's nav badge reads 1; opening the thread clears it, and the list alone does *not*
- [ ] A replies → B sees it, and A's own reply does not mark A's badge unread
- [ ] Reply still works after A marks the item **sold**
- [ ] Delete the listing → the conversation survives, showing "item no longer available"
- [ ] Owner sees no compose form on their own listing; sold listings show none either
- [ ] RLS check: member C cannot read A and B's thread via PostgREST — the database refuses it
- [ ] RLS check: a direct PostgREST `insert` into `messages` fails (no insert policy exists)
- [ ] Deactivate B → the thread vanishes for A; reactivate → it returns intact
- [ ] Remove a member → their threads and messages are gone

---

## Housekeeping
- [x] Commit the app (`feature/initial-scaffolding` → `feature/styling-and-logo` → `develop`)
- [ ] Fast-forward `main` to `develop` so Vercel's Production branch has the app
- [ ] Delete the merged `feature/*` branches once production is smoke-tested

## Decisions log
- **2026-06-15 — DB migrations:** apply [`0001_init.sql`](supabase/migrations/0001_init.sql)
  **manually, once**, in the Supabase SQL editor. Rejected the native Supabase
  GitHub integration (Branching): it needs the Pro plan (~$25/mo) + per-preview
  compute, which breaks the free-tier goal and is overkill for a one-time schema.
  Migration files stay CLI-compatible, so `supabase db push` automation can be
  added later with no rework.
- **2026-06-15 — Env vars:** set manually in Vercel settings. Declined the free
  Vercel ↔ Supabase env-sync integration for now to keep deploy simple.
- **2026-06-16 — Image handling:** photos upload *through* Server Actions (RLS stays
  in force) but are compressed in the browser first (resize ~1600px → JPEG) and
  HEIC/HEIF converted to JPEG via lazy-loaded `heic2any`. Server Action body limit
  raised to 4 MB (stays under Vercel's ~4.5 MB cap). If multi-photo uploads ever
  exceed limits in production, switch to direct browser→Storage uploads.
- **2026-06-16 — Free items:** modeled as `price_cents = 0` (no separate column);
  a "free" checkbox is UI sugar, and `formatPrice(0)` renders "Free".
- **2026-06-16 — Optional photos:** listings can be posted without any image; the
  grid and detail views already show a "No photo" placeholder.
- **2026-07-28 — Ship without invite email:** Resend's shared `onboarding@resend.dev`
  sender only delivers to the account owner's own address, so reaching real testers
  would require verifying a domain first. Deferred that: `RESEND_API_KEY` /
  `EMAIL_FROM` stay unset, and the invite action returns the temp password as
  structured data for the admin to copy from the UI. Turning email on later is an
  env-var change with no code edit. Trade-off: manual relay per invite, and still
  **no self-serve password reset** — a locked-out member needs a reset from the
  Supabase dashboard.
- **2026-07-28 — Production branch:** `main` (fast-forwarded from `develop`), so
  Vercel's default Production branch works unchanged and `develop` keeps getting
  preview deploys.
- **2026-07-29 — Member removal, two flavours:** **Remove** hard-deletes (the
  `auth.users` cascade clears profile → listings → listing_images; storage paths are
  read *before* the delete and the objects removed *after*, so the worst failure is
  orphaned files rather than a live member's photos being destroyed). **Deactivate**
  sets `profiles.deactivated_at` and is fully reversible. Deactivation is enforced by
  folding the check into `is_member()`, which every RLS policy already calls — so one
  function definition revokes read and write access everywhere, rather than each
  policy growing its own condition. Admin accounts are exempt from both: the app has
  no password reset and no UI to grant `is_admin`, so removing the last admin would
  permanently orphan the community.

- **2026-07-30 — In-app messaging, and why it isn't a privacy feature:** v1 deliberately
  excluded messaging; this reverses that. The motivation is *trust* (conversations stay in
  the community) and *convenience* (a form scoped to the item beats a blank `mailto:`),
  **not** privacy — sellers' email and phone stay visible, so messaging is a third channel
  rather than a replacement. Consequences: no email notification (Resend is off and its
  sandbox sender only reaches the account owner), so an unread message waits until the
  seller next visits — the compose form says so rather than implying instant delivery.
  Schema is **thread-shaped though the UI is one-shot**, so adding replies later is
  additive. Messages are **private to the two parties, admins included**: acting on an
  abusive member (deactivate/remove) never requires reading their mail. All writes go
  through `SECURITY DEFINER` functions with **no insert/update/delete policies at all**,
  because RLS cannot restrict *which columns* an update touches — a policy loose enough to
  let a recipient stamp `seller_read_at` would also let them rewrite `listing_id` or edit a
  message sent to them.

- **2026-07-30 — Replies, and one schema reversal:** the inbox's Received/Sent split was
  dropped for a single conversation list, because those labels describe who *started* a
  thread — meaningless once both sides talk. Replies are allowed on **sold and deleted**
  listings even though starting a thread still requires an active one: "sorry, it just sold"
  is exactly the message needed after marking something sold. That forced reversing a
  decision from `0003`: `message_threads.listing_id` cascaded on listing deletion, so
  deleting an item destroyed the discussion about it. It is now `on delete set null`, and
  the thread outlives the listing. `mark_threads_read()` was **dropped** rather than kept —
  stamping every thread at once suited a list that showed whole conversations, but would
  now clear New pills on threads never opened.

## Out of scope (v1)
Categories/tags, "reveal contact" gating, private image bucket with signed URLs,
Resend domain verification for production sending.

**Deliberately deferred within messaging (see Phase 10):** email notification of new
messages, admin visibility into messages, block/report, rate limiting, attachments,
realtime. (Replies shipped in Phase 10b.)
