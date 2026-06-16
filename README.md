# Community Market

An invite-only marketplace for a community. An admin invites members by email;
each member gets a temporary password, must change it on first login, and can
then post items for sale (photos, title, description, price). Other members see
the seller's contact info and arrange the sale off-platform.

Built with **Next.js (App Router)**, **Supabase** (Postgres + Auth + Storage),
**Resend** (email), and **Tailwind CSS**. Designed to run entirely on free tiers.

---

## How it works

- **Auth & access** — Supabase Auth. A request must (1) be logged in, (2) have a
  `profiles` row (be a member), and (3) have completed the first-login password
  change. All three are enforced in `proxy.ts` and re-checked in pages.
- **Invites** — only admins can invite. The invite creates the auth user with a
  temporary password (service-role key, server-side only) and emails it via
  Resend. `must_change_password` forces a reset on first login.
- **Listings** — owners can create/edit/delete their own listings, add up to 5
  photos, and mark items Sold. Row Level Security enforces ownership at the
  database, not just the UI.

## One-time setup

### 1. Supabase project

Both free Supabase project slots in use? Pause a dormant project, then create a
new one for this app (Dashboard → New project).

In the new project:

1. **SQL** — open the SQL editor and run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
   This creates the tables, RLS policies, the `listing-images` storage bucket,
   and triggers.
2. **Auth → Providers → Email** — turn **off** "Allow new users to sign up"
   (this app is invite-only).
3. **Auth → SMTP** (optional but recommended) — set Resend's SMTP credentials so
   password-reset emails work. Host `smtp.resend.com`, port `465`, user `resend`,
   password = your Resend API key.

### 2. Resend

1. Create an account at [resend.com](https://resend.com) and add an **API key**.
2. For testing you can send from `onboarding@resend.dev`. For production, verify
   your own domain and use an address on it.

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

This project targets **Node 18.18+** (see `.nvmrc` — Node 20 recommended).

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

1. Push this repo to GitHub and import it in Vercel.
2. Add the same environment variables from `.env.local` in the Vercel project
   settings. Set `APP_URL` to your production URL (e.g. `https://yourapp.vercel.app`)
   so invite emails link to the right place.
3. Deploy. Vercel runs `npm run build` automatically.

## Project structure

```
app/
  login/                  Sign-in page + action
  auth/change-password/   Forced first-login password change
  (app)/                  Authenticated area (header/nav layout)
    page.tsx              Listings grid (home)
    listings/            Create / detail / edit + server actions
    profile/             Member profile (display name + contact info)
    admin/invite/        Admin-only member invite + list
components/               Shared UI (cards, forms, gallery, buttons)
lib/
  supabase/              Browser / server / admin clients + proxy session logic
  listings.ts            Listing queries + image URL helpers
  config.ts              APP_NAME and other constants
  types.ts               Database types
supabase/
  migrations/0001_init.sql   Schema, RLS, storage, triggers
  seed_admin.sql             Grant the first admin
proxy.ts                  Session refresh + route protection (Next 16 "proxy")
```

## Notes

- Listing images live in a **public** storage bucket (images aren't sensitive),
  so they load via plain public URLs. Listing *data* and contact info are
  members-only via RLS.
- To rename the app, change `APP_NAME` in `lib/config.ts` or set
  `NEXT_PUBLIC_APP_NAME`.
