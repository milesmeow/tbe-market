# Community Market

An invite-only marketplace for a community. An admin invites members by email;
each member gets a temporary password, must change it on first login, and can
then post items for sale (title, description, price or **free**, with optional
photos). Other members see the seller's contact info, or send them a message
in the app, and arrange the sale off-platform.

Built with **Next.js (App Router)**, **Supabase** (Postgres + Auth + Storage),
**Resend** (email), and **Tailwind CSS**. Designed to run entirely on free tiers.

---

## How it works

- **Auth & access** — Supabase Auth. A request must (1) be logged in, (2) have a
  `profiles` row (be a member), (3) not be deactivated, and (4) have completed
  the first-login password change. All four are enforced in `proxy.ts` and
  re-checked in pages.
- **Removing members** — admins can either **Remove** a member (deletes their
  account, listings, and photos — permanent) or **Deactivate** them (keeps
  everything, revokes sign-in, hides their listings; reversible via
  **Reactivate**). Admin accounts are exempt from both, so the community can't
  be locked out of its own invite screen.
- **Invites** — only admins can invite. The invite creates the auth user with a
  temporary password (service-role key, server-side only) and either emails it via
  Resend or, when email is switched off, shows it on the invite screen for the
  admin to share. `must_change_password` forces a reset on first login.
- **Listings** — owners can create/edit/delete their own listings, mark items
  Sold, set a price or flag them **free**, and attach up to 5 photos (optional).
  Row Level Security enforces ownership at the database, not just the UI. The
  home grid filters by **All / Available / Sold** via `?status=`, so a filtered
  view can be shared or bookmarked.
- **Photos** — resized and compressed in the browser before upload, and iPhone
  **HEIC/HEIF converted to JPEG** automatically (see `lib/image.ts`). Keeps
  uploads small and web-displayable.
- **Messaging** — a member can ask about an item from the listing page, and both
  sides then carry on the conversation at **/messages**, with an unread count in
  the nav. The listing itself shows any conversation you already have about it,
  and shows the owner everyone who has asked. It's an *additional* way to reach someone: contact details stay
  visible throughout. **There is no email notification**, so a message waits
  until the other person next visits. Starting a thread needs an active listing,
  but **replies keep working after an item is sold or deleted** — that's when
  "sorry, it just went" needs saying. Messages are private to the two members;
  admins cannot read them. See
  [the design doc](docs/superpowers/specs/2026-07-30-in-app-messaging-design.md).

## One-time setup

### 1. Supabase project

Both free Supabase project slots in use? Pause a dormant project, then create a
new one for this app (Dashboard → New project).

In the new project:

1. **SQL** — open the SQL editor and run the migrations **in order**:
   [`0001_init.sql`](supabase/migrations/0001_init.sql) creates the tables, RLS
   policies, the `listing-images` storage bucket, and triggers;
   [`0002_member_deactivation.sql`](supabase/migrations/0002_member_deactivation.sql)
   adds member deactivation;
   [`0003_messaging.sql`](supabase/migrations/0003_messaging.sql) adds in-app
   messaging; [`0004_message_replies.sql`](supabase/migrations/0004_message_replies.sql)
   makes conversations two-way;
   [`0005_keep_alive.sql`](supabase/migrations/0005_keep_alive.sql) adds the row the
   daily keep-alive cron writes to.
   All are idempotent, so re-running is safe. Apply them **before**
   deploying app code that expects them — the app reads `profiles.deactivated_at`,
   and Postgres rejects the query until it exists.
2. **Auth → Providers → Email** — turn **off** "Allow new users to sign up"
   (this app is invite-only).
3. **Auth → SMTP** (optional but recommended) — set Resend's SMTP credentials so
   password-reset emails work. Host `smtp.resend.com`, port `465`, user `resend`,
   password = your Resend API key.

### 2. Resend (optional — currently switched off)

Email is **optional**. If `RESEND_API_KEY` / `EMAIL_FROM` are unset, the invite
screen shows the new member's sign-in details (login URL, email, temporary
password) for the admin to copy and pass along by text or in person. That is the
mode this app is deployed in today.

To turn email on:

1. Create an account at [resend.com](https://resend.com) and add an **API key**.
2. Verify a domain you own and send from an address on it. The shared
   `onboarding@resend.dev` sender only delivers to your own Resend account
   address, so it can't reach invited members.
3. Set `RESEND_API_KEY` and `EMAIL_FROM`. No code change is needed — the invite
   action switches to sending automatically.

### 3. Environment variables

Copy `.env.local.example` to `.env.local` and fill in the values (Supabase keys
from Project Settings → API; Resend key from the Resend dashboard).

```bash
cp .env.local.example .env.local
```

### 4. Seed the first admin

1. Supabase Dashboard → Authentication → Users → **Add user**. Use your email
   (`james@2-bit-toys.com`), set a password, and check **Auto Confirm User**.
2. Run [`supabase/seed_admin.sql`](supabase/seed_admin.sql) in the SQL editor to
   grant that account admin and skip its forced password change.

## Run locally

This project targets **Node 20.9+** — the minimum Next 16 itself requires (see
`.nvmrc`, which pins 20.19.1).

```bash
nvm use        # or ensure Node >= 18.18
npm install
npm run dev
```

Open http://localhost:3000. Log in as the admin, go to **Members** to invite
people, set your contact info under **Profile**, and post an item.

## Useful commands

```bash
npm run dev     # local dev server
npm run build   # production build
npm test        # unit tests (vitest)
npm run lint    # eslint
```

## Deploy to Vercel

1. Push this repo to GitHub and import it in Vercel. Production branch is `main`.
2. Add these environment variables in the Vercel project settings (Production and
   Preview), copying the values from `.env.local`:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_NAME`, `APP_URL`.
   `RESEND_API_KEY` / `EMAIL_FROM` are intentionally left unset (see Resend above).
   Add `CRON_SECRET` too (see "Keeping Supabase awake" below).
3. `APP_URL` needs the domain Vercel assigns, so deploy once, then set `APP_URL`
   to that URL (no trailing slash) and **redeploy** — env var changes don't apply
   to an existing deployment.
4. Before inviting anyone, turn **off** public signups in Supabase
   (Auth → Providers → Email). The app is invite-only and nothing else blocks
   self-registration.
5. Set `CRON_SECRET` and schedule the keep-alive ping (below).

## Keeping Supabase awake

Supabase pauses free-tier projects after about **7 days without database
activity**. A quiet week is normal for a small community market, so
`/api/cron/keep-alive` exists to bump a timestamp on a schedule. Hit it daily —
the 7-day threshold then leaves several days of slack to notice a broken pinger
before the project actually pauses.

The ping calls `record_keep_alive_ping()`, which updates the single row in
`keep_alive` (see [`0005_keep_alive.sql`](supabase/migrations/0005_keep_alive.sql)).
A write rather than a read, for two reasons: there is then no question about
whether the operation counts as activity, and `last_ping` is durable evidence
the request actually reached Postgres. The table has **no write policy** — the
`SECURITY DEFINER` function is the only way in, so the route runs on the anon
key and never needs the service-role key.

Generate a secret (`openssl rand -hex 32`), set it as `CRON_SECRET` in Vercel
(Production, marked sensitive), and **redeploy** — environment changes don't
apply to an existing deployment. The route returns **401** to anything without
`Authorization: Bearer $CRON_SECRET`, and denies everything when the variable is
unset, so a missing secret fails closed rather than leaving the endpoint open.

Then schedule it with either (or both — the query is a read, so a duplicate ping
is harmless):

- **Vercel Cron** — already declared in `vercel.json`. Vercel sends the
  `Authorization: Bearer $CRON_SECRET` header automatically, so there is nothing
  else to configure. Hobby tier allows 2 cron jobs at a once-per-day maximum,
  with best-effort timing.
- **cron-job.org** — create a job for `https://<your-domain>/api/cron/keep-alive`,
  daily, and add `Authorization: Bearer <secret>` under Advanced → Headers. Turn
  on failure notifications. Runs independently of Vercel.

**Verifying it works.** The ground truth is the table, not the scheduler's
dashboard — run this in the Supabase SQL editor:

```sql
select last_ping, now() - last_ping as age from public.keep_alive;
```

`age` should be under a day. Nothing can fake this: the timestamp only moves if
Postgres executed the write. A 200 from the scheduler, by contrast, proves less
than it looks — the route sits behind `proxy.ts`, which matches `/api/*` and
would bounce an unauthenticated request to `/login` (itself a 200) if the path
weren't listed in `PUBLIC_PATHS`.

## Project structure

```
app/
  login/                  Sign-in page + action
  auth/change-password/   Forced first-login password change
  api/cron/keep-alive/    Scheduled DB ping (stops Supabase pausing)
  (app)/                  Authenticated area (header/nav layout)
    page.tsx              Listings grid (home)
    listings/            Create / detail / edit + server actions
    profile/             Member profile (display name + contact info)
    messages/            Conversation list, thread pages, send/reply actions
    admin/invite/        Admin-only member invite + list
components/               Shared UI (cards, forms, gallery, buttons)
lib/
  supabase/              Browser / server / admin clients + proxy session logic
  listings.ts            Listing queries + image URL helpers
  messages.ts            Message queries, unread logic, inbox grouping
  image.ts               Browser-side photo compression + HEIC→JPEG conversion
  format.ts              Price/relative-time formatting (0 → "Free")
  config.ts              APP_NAME and other constants
  types.ts               Database types
docs/superpowers/specs/   Design docs for larger features
types/                    Ambient type declarations (e.g. heic2any)
supabase/
  migrations/            0001 schema/RLS/storage, 0002 deactivation,
                         0003 messaging, 0004 replies, 0005 keep-alive
  seed_admin.sql             Grant the first admin
proxy.ts                  Session refresh + route protection (Next 16 "proxy")
```

## Notes

- Listing images live in a **public** storage bucket (images aren't sensitive),
  so they load via plain public URLs. Listing *data* and contact info are
  members-only via RLS.
- **Photos** upload through Server Actions but are compressed client-side first;
  `next.config.ts` raises the Server Action body limit to 4 MB (under Vercel's
  ~4.5 MB serverless cap). HEIC/HEIF are converted to JPEG via `heic2any`, which
  is lazy-loaded only when an Apple photo is selected.
- **Free items** are simply `price_cents = 0` — no separate column. The "free"
  checkbox is UI sugar and the price renders as "Free".
- **Messages have no insert/update/delete RLS policies at all.** Every write goes
  through a `SECURITY DEFINER` function (`send_listing_message`,
  `reply_to_thread`, `mark_thread_read`), because RLS cannot restrict *which
  columns* an update touches — a policy permissive enough to let a recipient mark
  a thread read would also let them rewrite it. Messages are append-only as a
  result.
- **A conversation outlives its listing.** `message_threads.listing_id` is
  `on delete set null`, so deleting an item doesn't erase the discussion about
  it; the thread renders "item no longer available" instead.
- To rename the app, change `APP_NAME` in `lib/config.ts` or set
  `NEXT_PUBLIC_APP_NAME`.
