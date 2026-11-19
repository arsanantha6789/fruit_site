# Fresh Basket: fresh produce store + owner dashboard

Version 1 has two interfaces:

1. **Customer website**: browse, cart, checkout (cash/UPI on delivery), order tracking, account.
2. **Owner/admin dashboard** at `/admin`: live new-order alerts, order lifecycle, payments, stock, packing slips, reports; plus catalogue and settings for the admin team.

Stack: **Next.js 16** (App Router, TypeScript, Tailwind CSS 4) · **Supabase** (Postgres + Row Level Security, Auth, Storage) · zod · Vitest + Playwright.

---

## Who can do what

| Action | Customer | Owner | Admin (dev team) |
|---|:-:|:-:|:-:|
| Shop, order, track own orders, cancel while "New" | ✅ | | |
| See all orders, change status, mark payments, print packing slips | | ✅ | ✅ |
| Update stock, mark unavailable / available, low-stock levels, reports | | ✅ | ✅ |
| Change prices | | only if admin turns on "Owner can edit prices" | ✅ |
| Products, photos, sizes, categories, business settings | | | ✅ |

Enforced three times: page guards (`modules/auth/session.ts`), server actions, and the database itself (RLS + functions).

Order lifecycle: **New → Confirmed → Preparing → Ready for delivery → Out for delivery → Delivered**, or **Cancelled** (stock is put back automatically). Every change is stored with time and the person who made it.

---

## Launch checklist (do these in order)

### 1. Create the Supabase project
1. supabase.com → New project. Region: **Mumbai (ap-south-1)**. Save the database password in a password manager.
2. Install the CLI and link: `npx supabase login` then `npx supabase link --project-ref YOUR_REF`.
3. Apply the database: `npx supabase db push` (runs everything in `supabase/migrations`).
4. Optional demo catalogue: open Supabase → SQL Editor, paste `supabase/seed.sql`, Run.

### 2. Configure Supabase Auth (Dashboard → Authentication)
- **Sign In / Providers → Email**: keep *Confirm email* **ON**.
- **URL Configuration**: Site URL = `https://your-domain.in`; Redirect URLs = `https://your-domain.in/**`.
- **Emails → SMTP**: connect a real email sender (e.g. Resend SMTP). The built-in sender is limited to a few emails per hour.
- **Email templates**: so links work on any device, change the link in *Confirm signup* to
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/`
  and in *Reset password* to
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`
- **Rate limits / Attack protection**: keep the defaults; turn on CAPTCHA later if you see bot sign-ups.

### 3. Deploy to Vercel
1. Import this GitHub repo in Vercel.
2. Settings → Environment Variables (copy names from `.env.example`):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase → Project Settings → API
   - `SUPABASE_SERVICE_ROLE_KEY`: same page, **secret**; never prefix with `NEXT_PUBLIC_`
   - `NEXT_PUBLIC_SITE_URL`: `https://your-domain.in`
   - Optional: `RESEND_API_KEY`, `EMAIL_FROM`, `OWNER_NOTIFICATION_EMAIL` (owner gets an email for every order), `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`
3. Deploy, then add your domain.

### 4. Create the owner and admin accounts
Both sign up on the website like a customer, confirm their email, then run in Supabase → SQL Editor:
```sql
update public.profiles set role = 'owner' where email = 'owner@example.com';
update public.profiles set role = 'admin' where email = 'developer@example.com';
```
They log out and in again and land on `/admin`.

### 5. First-day setup (admin)
- Dashboard → **Settings**: business name, address, phone, GSTIN, delivery fee, free-delivery threshold, delivery pincodes, payment methods, **hero and promo photos**.
- Dashboard → **Categories** and **Products**: upload a photo for every product and category (JPG/PNG/WebP up to 3 MB; natural light, plain background). Until a photo is uploaded the store shows a tidy placeholder tile.
- Owner → **Stock**: enter today's quantities.

### 6. Safety nets
- Supabase → Database → **Backups**: daily backups are on for paid plans; turn on **Point-in-Time Recovery** before launch. Practise one restore.
- Vercel → Deployments: any previous deploy can be restored with **Promote to Production**.
- `supabase/rollback/v1_down.sql` removes the v1 schema; only for an empty, broken first deploy.

---

## Daily use (owner)
- Keep **/admin** open on your phone or counter computer. New orders make a **chime**, show a **pop-up** and a red **bell badge** (checked every 20 seconds).
- Open the order → **Mark as confirmed** → … → **Delivered**. Customers see each step on their order page.
- **Print packing slip** opens an A4 slip in a new tab. Use *Print* or choose *Save as PDF*. There is a ✓ box per item for packing.
- **Stock**: type the new quantity and press Save. *Mark unavailable* hides a product from sale without losing its stock number.

---

## Developing locally
```bash
npm ci
cp .env.example .env.local   # fill in a Supabase project (or a local `npx supabase start`)
npm run dev
```
Checks (CI runs the same):
```bash
npm run lint && npm run typecheck
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/fresh_test npm test
npm run build
```
The DB tests rebuild a throwaway database (its name must contain `test`) from `supabase/migrations` with a small Supabase stand-in (`supabase/tests/supabase_stub.sql`) and check RLS, two-user isolation, overselling under concurrency, idempotent checkout, the lifecycle and stock restoration.

## Architecture
```
src/
  app/(store)/…           customer pages          app/admin/…   dashboard pages
  app/print/orders/[id]   packing slip (own CSS, independent of dashboard UI)
  app/api/admin/notifications   polled by the dashboard bell
  proxy.ts                session refresh + sign-in redirects (first line only)
  modules/
    auth/          session (DAL), login/signup/reset/delete actions, rate limiting
    customers/     profile + saved addresses
    catalog/       products, variants, units, image uploads
    categories/    category management
    inventory/     stock, availability, low-stock, prices
    cart/          browser cart (ids + qty only) + server-side quote
    checkout/      place order → place_order() in Postgres
    orders/        lists, detail, status changes, status definitions
    payments/      methods/statuses (provider-ready)
    notifications/ in-app (DB) + email channel
    packing-slip/  A4 slip component
    tracking/      customer timeline
    reports/       sales summaries
    settings/      business configuration
  components/ui    design-system primitives      lib/   env, supabase clients, money, errors
supabase/migrations   schema, functions, RLS, storage (source of truth)
```
**Data flow of an order:** browser cart (ids + quantities) → `placeOrderAction` (zod validation, signed-in check) → Postgres `place_order()` locks the stock rows, re-reads prices, checks pincode/store open/limits, writes the order + item snapshots + history + payment + staff notification, decrements stock, all in one transaction → the owner's dashboard picks up the notification. If anything fails, nothing is saved and the customer gets a plain-language message.

### Ready for later (not built in v1)
| Future feature | Where it plugs in |
|---|---|
| Delivery partner app / assignments | new `delivery_partner` role + `delivery_assignments(order_id, partner_id)`; partners get RLS on assigned orders only; statuses already timestamped |
| External delivery service | adapter called from `updateOrderStatusAction` on "Ready for delivery" |
| WhatsApp Business | a second channel next to `notifications/email.ts`, chosen in `notifications/service.ts` |
| Subscriptions / recurring orders | `subscriptions` table + scheduled job calling the same `place_order()` |
| Multiple branches / warehouses | add `location_id` to `inventory` (already separate from products) and `orders` |
| Multiple administrators | already supported: give more profiles the `admin`/`owner` role |
| Live tracking | extra events on `order_status_history` / a `delivery_locations` table; `tracking/timeline` renders them |
| Loyalty, referrals, coupons | `orders.discount_paise` already flows through totals and packing slips |
| Online payments (Razorpay) | new `payment_method` value + provider row in `payments` (supports many attempts per order); webhook route verifies signatures server-side |
| Advanced analytics | reports read through SECURITY INVOKER SQL functions; add more alongside |

## Legal
`/privacy` and `/terms` are **starting templates, not legal advice**. Have them reviewed (India's DPDP Act 2023 applies) and fill in the jurisdiction line in the Terms.
