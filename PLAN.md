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

## Phase 2 — Database ✅ (code) / [!] (apply to your project)
- [x] Migration written: [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) — tables, RLS, storage bucket, triggers
- [x] Admin seed script: [`supabase/seed_admin.sql`](supabase/seed_admin.sql)
- [!] Pause a dormant Supabase project, create the new marketplace project
- [!] Run `0001_init.sql` in the new project's SQL editor
- [!] Turn off public signups (Auth → Providers → Email)
- [!] Seed your admin user, then run `seed_admin.sql`

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

## Phase 6 — Profile + contact ✅
- [x] [Profile editor](app/(app)/profile/page.tsx) (display name + contact email/phone)
- [x] Seller contact rendered on listing detail (members only)

## Phase 7 — Polish ✅
- [x] Header/nav with APP_NAME ([app layout](app/(app)/layout.tsx)), sign out
- [x] Responsive grid, empty/loading/error states, form validation
- [x] Shared UI primitives ([components/ui.tsx](components/ui.tsx), cards, forms)

## Phase 8 — Deploy [!]
- [ ] Copy `.env.local.example` → `.env.local`, fill in keys
- [!] Push to GitHub, import in Vercel, add env vars (incl. production `APP_URL`)
- [!] Deploy

---

## Verification

### Automated (done) ✅
- [x] `npx tsc --noEmit` — passes
- [x] `npm run lint` — passes
- [x] `npm run build` — passes
- [x] `npm test` — 6/6 passing ([lib/format.test.ts](lib/format.test.ts))

### End-to-end (blocked — needs your Supabase + Resend) [!]
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

## Out of scope (v1)
Categories/tags, "reveal contact" gating, in-app messaging, private image bucket
with signed URLs, Resend domain verification for production sending.
