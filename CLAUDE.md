@AGENTS.md

## Project: Community Market (`tbe-market`)

An **invite-only, single-community classifieds marketplace**. Admins invite members
by email (temp password, forced change on first login). Members post items for sale
(title, description, price **or free**, optional photos, up to 5); other members
browse and see the seller's contact info to arrange the sale **off-platform**. There
is no in-app payment, cart, or messaging. Designed to run entirely on free tiers.

`README.md` has full one-time setup (Supabase project, Resend, env vars, admin seed,
deploy); `PLAN.md` has the build plan and out-of-scope list. Reference those rather
than duplicating setup steps here.

## Tech stack

- **Next.js 16.2.9** (App Router — no `src/`, no `pages/`), **React 19.2.4**,
  **TypeScript** `^5` (strict). Path alias `@/*` → repo root.
- **Supabase** — Postgres + Auth + Storage (`@supabase/ssr`, `@supabase/supabase-js`).
- **Resend** — transactional email (invites, password reset).
- **Tailwind CSS v4** — PostCSS-based, **no `tailwind.config`** (see `postcss.config.mjs`).
- **heic2any** — HEIC/HEIF → JPEG conversion. **Vitest** — tests. **ESLint 9** (flat
  config). Package manager: **npm**.
- Node **>=20.9** (what Next 16 requires; `.nvmrc` pins 20.19.1). **Gotcha:** fresh
  shells default to Node v11 — prefix PATH with nvm's v20 before building.

## Commands

- `npm run dev` — dev server (http://localhost:3000)
- `npm run build` — production build
- `npm test` — unit tests (vitest; `lib/format.test.ts`, `lib/messages.test.ts`).
  `vitest.config.ts` exists only to re-declare the `@/*` alias — vitest ignores
  tsconfig `paths`, so without it any test touching an aliased import fails to resolve.
- `npm run lint` — eslint

## Next.js 16 specifics (differs from older Next — see AGENTS.md)

- Middleware is renamed **"proxy"**: root `proxy.ts` exports `proxy()` + a matcher and
  delegates to `lib/supabase/middleware.ts`.
- `next.config.ts` raises Server Action `bodySizeLimit` to **4 MB** for photo uploads
  (under Vercel's ~4.5 MB cap).
- Read `node_modules/next/dist/docs/` before writing Next.js code (per AGENTS.md).

## Architecture & security invariants

- **Four-gate access**, enforced in `proxy.ts` **and re-checked in pages**: (1) logged
  in, (2) has a `profiles` row (= is a member), (3) not deactivated
  (`profiles.deactivated_at is null`), (4) completed first-login password change.
- **`/api/cron/keep-alive` is the only route reachable without a session**, and
  `CRON_SECRET` is its entire authorization — a bearer-token compare in `lib/cron.ts`
  that **fails closed** when the variable is unset. It exists because Supabase pauses
  free projects after ~7 days of database inactivity. Two things are load-bearing and
  easy to break: it must stay listed in `PUBLIC_PATHS` (`lib/supabase/middleware.ts`),
  or the proxy's `/api/*` matcher redirects it to `/login` and it never reaches the
  database *while still returning 200 to the scheduler*; and it must keep returning
  non-2xx on a query error, or the scheduler's failure alerting is decorative. It writes
  via `record_keep_alive_ping()` (SECURITY DEFINER, granted to `anon`) rather than reading,
  so there's no question whether the operation counts as activity and `keep_alive.last_ping`
  is durable proof the request reached Postgres. It uses the **anon** client deliberately —
  an endpoint reachable without a session must not hold one that bypasses RLS, and the
  definer function means it doesn't need to.
- **Ownership is enforced by Supabase Row Level Security, not just the UI** — never rely
  on UI checks alone. `is_member()` (SECURITY DEFINER) gates reads; owners write only
  their own rows. Trigger `prevent_admin_escalation` blocks self-granting `is_admin`.
- **`is_member()` is the choke point for membership.** It resolves to
  `is_active_member(auth.uid())`, so deactivation revokes read *and* write access across
  every policy at once. Widen membership rules there, not policy by policy.
- Split Supabase clients: `lib/supabase/client.ts` (browser), `server.ts` (server),
  `admin.ts` (**service-role, server-only** — invites, member removal/deactivation; never
  expose to the client). Actions using it **bypass RLS**, so their own `callerAdminId()`
  check is the entire authorization boundary — hiding a button is not a control.
- Schema source of truth: `supabase/migrations/` — `0001_init.sql`, `0002_member_deactivation.sql`,
  `0003_messaging.sql`, `0004_message_replies.sql`, `0005_keep_alive.sql`, applied **manually
  and in order** in the Supabase SQL editor; TS mirror `lib/types.ts`. Tables: `profiles`,
  `listings`, `listing_images`, `message_threads`, `messages`, `keep_alive`.
  Storage bucket `listing-images` is **public read**, member-only insert, owner-only delete.
- **The message tables have no write policies at all** — RLS grants `select` and nothing
  else, and `send_listing_message` / `reply_to_thread` / `mark_thread_read` (SECURITY
  DEFINER) are the only way in. RLS cannot restrict *which columns* an `update` touches, so
  a policy loose enough to let a recipient stamp `seller_read_at` would also let them
  rewrite `listing_id` or edit a message sent to them. Don't "fix" a permission error here
  by adding an insert/update policy; change the function.
- **Migrate before deploying code that reads a new column.** PostgREST 400s on an unknown
  column; the proxy treats a *failed* profile query as "cannot verify" (deny, keep the
  session) rather than "not a member" (sign out) specifically so version skew doesn't
  lock everyone out.

## Domain rules & gotchas

- **Free = `price_cents = 0`** — there is no separate "free" column; the checkbox is UI
  sugar. `formatPrice(0)` → `"Free"` (`lib/format.ts`).
- **Messaging is an extra channel, not a privacy feature.** Contact details stay visible on
  every listing and inside every thread; the message form sits *below* them. There is **no
  email notification** (Resend is off), so a message waits until the other person next signs
  in — say so in UI copy rather than implying delivery. Messages are private to the two
  parties, **admins included**.
- **Starting a thread needs an active listing; replying doesn't.** `send_listing_message`
  checks `status = 'active'`, `reply_to_thread` deliberately does not — a seller has to be
  able to answer "sorry, it just sold" *after* marking it sold. Likewise `listing_id` is
  `on delete set null`, so a conversation outlives its listing and the UI falls back to
  "item no longer available".
- **`getThreadsForListing()` takes no role argument on purpose** — RLS returns a buyer their
  own thread and a seller every thread about their item, so one query drives both listing-page
  panels. Ownership is checked only to pick a heading, never to decide which rows are safe to
  show.
- **Mark-as-read runs in `after()`**, not during render — Next forbids mutations as a
  render side-effect. `markThreadRead()` takes an already-built client because a Server
  Component may not call `cookies()` inside an `after` callback; a client created during
  render has already resolved the cookie store. It fires on the **thread page only** — the
  conversation list marks nothing, or New pills would clear on threads never opened.
- `unreadThreadCount()` returns 0 on error rather than throwing — it runs in the
  authenticated layout, so throwing would take down every signed-in page if `0003`
  hasn't been applied yet.
- **Image pipeline** (`lib/image.ts`): browser-side compress to 1600px longest edge, JPEG
  q0.8, EXIF-aware. HEIC/HEIF → JPEG via `heic2any`, **lazy-loaded** only when an Apple
  photo is selected; on failure it falls back to the original file. Photos upload *through*
  Server Actions so RLS applies. Max **5 photos/listing** (`MAX_IMAGES_PER_LISTING` in
  `lib/config.ts`).
- Photos are optional — grid/detail show a "No photo" placeholder.
- **The home grid's filter and sort live in the URL, not in component state** —
  `?status=` and `?sort=`, both parsed leniently (an unrecognised value falls back to
  the default rather than erroring or showing an empty grid). Every link that lands on
  the home page must go through **`listingsHref(filter, sort)`**: the two tab groups each
  have to preserve the other's choice, and a hand-written `/` or `?status=sold` silently
  resets the one it doesn't mention. Defaults are omitted from the query string so the
  default view has a single canonical URL.
- **`sort` only flips the `created_at` direction — `status` stays the primary sort key.**
  "Oldest" means the oldest *available* items first; sorting sold listings to the top of
  a marketplace would be a strange thing to offer.
- Rebrand via `APP_NAME` in `lib/config.ts` (or `NEXT_PUBLIC_APP_NAME`).

## Mobile-first UI

Members browse and post from their phones — photographing an item and listing it is a
phone-shaped task. **The 375px phone is the design target; desktop is the enhancement.**

- **Write the phone layout in unprefixed utilities, then scale up with `sm:`/`md:`/`lg:`.**
  Never build a desktop layout and patch it with `max-*` overrides. If a component has no
  breakpoint variants at all, that's fine only when the phone layout already *is* the
  desktop one.
- **Interactive elements need a ≥44px touch target.** The shared classes in
  `components/ui.tsx` (`inputClass`, `primaryButtonClass`, `secondaryButtonClass`,
  `smallButtonClass`, `navLinkClass`) all carry `min-h-11` — use them rather than
  hand-rolling, and don't shrink them at the call site with `py-1`/`py-1.5`. A 16px
  checkbox is fine visually as long as its `<label>` wrapper is the real target.
- **Never put a `<table>` in front of a phone.** Tables are `hidden md:block` with a
  stacked card list below — `app/(app)/admin/invite/page.tsx` is the reference. A table
  wrapper clips with `overflow-x-auto`, **never** `overflow-hidden` (that hides the row
  actions instead of letting you reach them).
- **User-supplied strings wrap.** Emails, phone numbers, and message bodies need explicit
  `break-words` (or `break-all` for addresses) — `whitespace-pre-wrap` alone will not
  break a long URL, and one long address overflows a card at 375px. `globals.css` sets
  `overflow-wrap: anywhere` as a global backstop; don't rely on it inside cards.
- **Inputs stay at ≥16px font size.** `text-sm` on an `<input>`/`<textarea>` makes iOS
  Safari zoom the page on focus. Labels and helper text may be `text-sm`; the field itself
  may not.
- **Mobile keyboard hints are part of the field definition** — `type`, `inputMode`,
  `autoComplete`, and `autoCapitalize="none"` on email fields (iOS capitalizes the first
  letter otherwise). Price is `type="text" inputMode="decimal"` **deliberately** — don't
  "fix" it to `type="number"`, which brings back spinners and scroll-wheel edits.
- **Fixed or sticky bottom UI respects the iOS home indicator** — use the `pb-safe`
  helper in `globals.css`. The root layout sets `viewportFit: "cover"`, which is what makes
  `env(safe-area-inset-*)` non-zero.
- **`maximumScale` / `userScalable: false` are off the table** — blocking pinch-zoom is an
  accessibility regression, not a polish item.
- **The header is two implementations of one nav.** `components/MobileNav.tsx` (drawer,
  `sm:hidden`) and the inline cluster in `app/(app)/layout.tsx` (`hidden sm:flex`) must
  both render the unread badge — that's why it lives in `components/UnreadBadge.tsx`
  rather than inline. Add a nav item to both or to neither.
- **Verify at 375px before calling a UI change done**, and confirm
  `document.documentElement.scrollWidth > window.innerWidth` is `false` — horizontal page
  scroll is the failure this checklist exists to prevent.

## Directory map

- `app/` — App Router. `login/`, `auth/change-password/`, `api/cron/keep-alive/`, and the
  authenticated `(app)/` group (`listings/`, `profile/`, `messages/`, `admin/invite/`,
  shared `layout.tsx` + `actions.ts`).
- `components/` — shared UI (`ListingCard`, `ListingForm`, `Gallery`, `ConfirmButton`,
  `MessageSellerForm`, `ReplyForm`, `ThreadRow`, `MobileNav`, `UnreadBadge`,
  `SegmentedTabs` + its two users `ListingFilterTabs`/`ListingSortTabs`, `ui`).
- `lib/` — `supabase/` clients + `middleware.ts`, `listings.ts`, `messages.ts`, `image.ts`,
  `format.ts`, `config.ts`, `cron.ts`, `types.ts`.
- `supabase/` — `migrations/` (`0001_init.sql`, `0002_member_deactivation.sql`,
  `0003_messaging.sql`, `0004_message_replies.sql`, `0005_keep_alive.sql`), `seed_admin.sql`.
  `types/` — ambient decls.
- `docs/superpowers/specs/` — design docs for larger features.

## Git

- **Never commit for me.** Do not run `git commit` (or `git push`) under any
  circumstances, even when explicitly asked or when it seems like the natural next
  step. I always commit manually. You may stage/edit files and suggest a commit
  message, but I run the commit.
