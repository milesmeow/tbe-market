# Community Market — Build Plan & Progress

Living checklist for the invite-only community marketplace. Update the boxes as
work lands. See [README.md](README.md) for setup details and the original design
brief for full context.

**Stack:** Next.js 16 (App Router) + React 19 + Tailwind v4 · Supabase (Postgres,
Auth, Storage) · Resend (email) · Vercel (hosting). All free tier.

**Status legend:** `[x]` done · `[~]` in progress · `[ ]` not started ·
`[!]` blocked on you (needs your accounts/keys)

---

## Phase 1 — Scaffold ✅
- [x] Next.js + TypeScript + Tailwind project
- [x] Supabase clients: [browser](lib/supabase/client.ts), [server](lib/supabase/server.ts), [admin](lib/supabase/admin.ts)
- [x] [`lib/config.ts`](lib/config.ts) (APP_NAME, constants) + [`lib/types.ts`](lib/types.ts)
- [x] Node version pinned ([.nvmrc](.nvmrc), `engines` in package.json)

## Phase 2 — Database ✅
- [x] Migration written: [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) — tables, RLS, storage bucket, triggers
- [x] Admin seed script: [`supabase/seed_admin.sql`](supabase/seed_admin.sql)
- [x] New marketplace Supabase project created (Data API + auto-expose + automatic RLS enabled)
- [x] Ran `0001_init.sql` in the new project's SQL editor
- [x] Seeded admin user (created auth user, ran `seed_admin.sql`)
- [ ] Turn off public signups (Auth → Providers → Email) — recommended, do before inviting

## Phase 3 — Auth ✅
- [x] Session refresh + route protection: [`proxy.ts`](proxy.ts) + [`lib/supabase/middleware.ts`](lib/supabase/middleware.ts)
- [x] [Login page + action](app/login/page.tsx)
- [x] [Forced first-login password change](app/auth/change-password/page.tsx)

## Phase 4 — Member admin ✅ (code) / [!] (needs Resend key)
- [x] [Invite flow + member list](app/(app)/admin/invite/page.tsx) ([actions](app/(app)/admin/invite/actions.ts))
- [x] Resend transactional invite email
- [!] Create a Resend account + API key, set `EMAIL_FROM`

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

## Phase 8 — Deploy [!]
- [x] Copy `.env.local.example` → `.env.local`, fill in keys (running locally)
- [!] Push to GitHub, import in Vercel, add env vars (incl. production `APP_URL`)
- [!] Deploy

## Phase 9 — Post-MVP refinements ✅
- [x] Client-side image compression (resize ~1600px, JPEG) — [lib/image.ts](lib/image.ts)
- [x] HEIC/HEIF (iPhone) → JPEG conversion via `heic2any` (lazy-loaded)
- [x] Raised Server Action body limit to 4 MB — [next.config.ts](next.config.ts)
- [x] Resilient image preview (placeholder for non-web formats) — [components/ListingForm.tsx](components/ListingForm.tsx)
- [x] Photos optional when posting
- [x] "This item is free" checkbox → `price_cents = 0`, displays as "Free"

---

## Verification

### Automated (done) ✅
- [x] `npx tsc --noEmit` — passes
- [x] `npm run lint` — passes
- [x] `npm run build` — passes
- [x] `npm test` — 7/7 passing ([lib/format.test.ts](lib/format.test.ts))

### Local (in progress) 🚧
- [x] Admin logs in locally against the live Supabase project
- [x] Posts a listing (photo upload working after HEIC + compression fixes)
- [ ] Verify free + no-photo listings render correctly

### End-to-end (needs Resend for invites) [!]
- [ ] Admin invites a test member → Resend email arrives with temp password
- [ ] Member logs in → forced to change-password → sets new password
- [ ] Member sets contact info; posts a listing with 2–3 photos
- [ ] Second member sees the listing + seller contact; non-member sees nothing
- [ ] Owner edits, marks Sold (badge shows), deletes
- [ ] RLS check: a member cannot edit/delete another member's listing
- [ ] Repeat smoke test against the deployed Vercel URL

---

## Housekeeping
- [ ] Commit the initial app (currently uncommitted on `develop`)

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

## Out of scope (v1)
Categories/tags, "reveal contact" gating, in-app messaging, private image bucket
with signed URLs, Resend domain verification for production sending.
