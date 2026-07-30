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
- Node **>=18.18** (`.nvmrc` pins 20.19.1; Node 20 recommended). **Gotcha:** fresh
  shells default to Node v11 — prefix PATH with nvm's v20 before building.

## Commands

- `npm run dev` — dev server (http://localhost:3000)
- `npm run build` — production build
- `npm test` — unit tests (vitest; the only tests are `lib/format.test.ts`)
- `npm run lint` — eslint

## Next.js 16 specifics (differs from older Next — see AGENTS.md)

- Middleware is renamed **"proxy"**: root `proxy.ts` exports `proxy()` + a matcher and
  delegates to `lib/supabase/middleware.ts`.
- `next.config.ts` raises Server Action `bodySizeLimit` to **4 MB** for photo uploads
  (under Vercel's ~4.5 MB cap).
- Read `node_modules/next/dist/docs/` before writing Next.js code (per AGENTS.md).

## Architecture & security invariants

- **Three-gate access**, enforced in `proxy.ts` **and re-checked in pages**: (1) logged
  in, (2) has a `profiles` row (= is a member), (3) completed first-login password change.
- **Ownership is enforced by Supabase Row Level Security, not just the UI** — never rely
  on UI checks alone. `is_member()` (SECURITY DEFINER) gates reads; owners write only
  their own rows. Trigger `prevent_admin_escalation` blocks self-granting `is_admin`.
- Split Supabase clients: `lib/supabase/client.ts` (browser), `server.ts` (server),
  `admin.ts` (**service-role, server-only** — used for invites; never expose to the client).
- Schema source of truth: `supabase/migrations/0001_init.sql`; TS mirror `lib/types.ts`.
  Tables: `profiles`, `listings`, `listing_images`. Storage bucket `listing-images` is
  **public read**, member-only insert, owner-only delete.

## Domain rules & gotchas

- **Free = `price_cents = 0`** — there is no separate "free" column; the checkbox is UI
  sugar. `formatPrice(0)` → `"Free"` (`lib/format.ts`).
- **Image pipeline** (`lib/image.ts`): browser-side compress to 1600px longest edge, JPEG
  q0.8, EXIF-aware. HEIC/HEIF → JPEG via `heic2any`, **lazy-loaded** only when an Apple
  photo is selected; on failure it falls back to the original file. Photos upload *through*
  Server Actions so RLS applies. Max **5 photos/listing** (`MAX_IMAGES_PER_LISTING` in
  `lib/config.ts`).
- Photos are optional — grid/detail show a "No photo" placeholder.
- Rebrand via `APP_NAME` in `lib/config.ts` (or `NEXT_PUBLIC_APP_NAME`).

## Directory map

- `app/` — App Router. `login/`, `auth/change-password/`, and the authenticated `(app)/`
  group (`listings/`, `profile/`, `admin/invite/`, shared `layout.tsx` + `actions.ts`).
- `components/` — shared UI (`ListingCard`, `ListingForm`, `Gallery`, `ConfirmButton`, `ui`).
- `lib/` — `supabase/` clients + `middleware.ts`, `listings.ts`, `image.ts`, `format.ts`,
  `config.ts`, `types.ts`.
- `supabase/` — `migrations/0001_init.sql`, `seed_admin.sql`. `types/` — ambient decls.

## Git

- **Never commit for me.** Do not run `git commit` (or `git push`) under any
  circumstances, even when explicitly asked or when it seems like the natural next
  step. I always commit manually. You may stage/edit files and suggest a commit
  message, but I run the commit.
