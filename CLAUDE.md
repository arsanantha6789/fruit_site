# Project rules: Fresh Basket (Next.js 16 App Router + Supabase Postgres/Auth/Storage)

Follow the production-web-builder standards. The owner is not a programmer: you are responsible for security and quality by default.

<!-- BEGIN:nextjs-agent-rules -->
This is Next.js 16: APIs differ from older versions. Read `node_modules/next/dist/docs/` before using an unfamiliar API.
`middleware.ts` is now `src/proxy.ts`. `params`/`searchParams`/`cookies()` are async. Cache Components is OFF on purpose.
<!-- END:nextjs-agent-rules -->

## Security (never break)
- No secrets in client code. `SUPABASE_SERVICE_ROLE_KEY` and `RESEND_API_KEY` are used only in `lib/supabase/admin.ts` / `modules/notifications/email.ts` (both `server-only`).
- Every page/action decides identity via `modules/auth/session.ts` (`getCurrentUser`, `requireStaffPage`, `requireAdminPage`, `staffOrNull`, `adminOrNull`). Roles come from `profiles.role`, never from user metadata.
- Row Level Security is ON for every table. New tables: enable RLS, add explicit grants + policies in a NEW migration, and add a two-user test in `tests/db/`.
- Stock, orders and payments change ONLY through the SECURITY DEFINER functions in `supabase/migrations/*_functions.sql` (row locks, history, ledger). Never update those tables directly from app code.
- New SQL functions: `security definer set search_path = ''`, check `auth.uid()`/role inside, then `revoke execute ... from public, anon` and grant only what is needed.
- Validate every action input with zod; read form fields through `lib/form.ts#parseForm` (allow-list). Return `ActionResult` with friendly messages (`lib/errors.ts`).
- Images: only Supabase Storage URLs (`lib/images.ts`). No `dangerouslySetInnerHTML`. Redirect targets through `safeNextPath`.
- Rate limits: `modules/auth/rate-limit.ts` (DB-backed). Order abuse limit lives in `place_order()`.
- Never log passwords, tokens, cookies, addresses or full bodies.

## Code
- Modules: `src/modules/<module>/{repo,actions,schema,types,...}`; pages in `src/app`; shared UI in `src/components/ui`.
- Money is integer paise. Stock is numeric in the product's base unit; variants consume `quantity_in_base`.
- Order items keep snapshots (name, label, unit, price): never join live catalogue data for historical orders.
- Files ≤ ~300 lines. Reuse helpers in `src/lib`.
- New npm package? Ask first and verify it is real and popular.
- Schema changes only via new files in `supabase/migrations` (never edit applied ones). Destructive changes: stop and explain.

## Workflow
- Plan first (pages, data, routes, access rules, limits, edge cases).
- `npm run lint && npm run typecheck && npm test && npm run build` before saying done (`TEST_DATABASE_URL` points to a throwaway Postgres whose name contains "test").
- Never weaken a test or remove a check to make an error go away.
