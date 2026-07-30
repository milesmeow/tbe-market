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
  Row Level Security enforces ownership at the database, not just the UI.
- **Photos** — resized and compressed in the browser before upload, and iPhone
  **HEIC/HEIF converted to JPEG** automatically (see `lib/image.ts`). Keeps
  uploads small and web-displayable.
- **Messaging** — a member can send a note about an item from the listing page,
  and read what they've received at **/messages**, with an unread count in the
  nav. It's an *additional* way to reach a seller: contact details stay visible,
  and there's no reply box yet — the seller answers by email or phone. **There is
  no email notification**, so a message waits until the seller next visits. See
  [the design doc](docs/superpowers/specs/2026-07-30-in-app-messaging-design.md).
  Messages are private to the two members; admins cannot read them.

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
   messaging. All are idempotent, so re-running is safe. Apply them **before**
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
3. `APP_URL` needs the domain Vercel assigns, so deploy once, then set `APP_URL`
   to that URL (no trailing slash) and **redeploy** — env var changes don't apply
   to an existing deployment.
4. Before inviting anyone, turn **off** public signups in Supabase
   (Auth → Providers → Email). The app is invite-only and nothing else blocks
   self-registration.

## Project structure

```
app/
  login/                  Sign-in page + action
  auth/change-password/   Forced first-login password change
  (app)/                  Authenticated area (header/nav layout)
    page.tsx              Listings grid (home)
    listings/            Create / detail / edit + server actions
    profile/             Member profile (display name + contact info)
    messages/            Inbox + send-message action
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
  migrations/            0001 schema/RLS/storage, 0002 deactivation, 0003 messaging
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
  `mark_threads_read`), because RLS cannot restrict *which columns* an update
  touches — a policy permissive enough to let a recipient mark a thread read would
  also let them rewrite it. Messages are append-only as a result.
- To rename the app, change `APP_NAME` in `lib/config.ts` or set
  `NEXT_PUBLIC_APP_NAME`.
