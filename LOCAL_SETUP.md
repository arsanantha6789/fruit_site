# Run Fresh Basket on your own computer (http://localhost:3000)

You need: **Node.js 20+** (nodejs.org), **Docker Desktop** (docker.com, keep it open) and **Git**.

1. Download the code and install:
   ```bash
   git clone https://github.com/akankshk08/fruit_ecommerce.git
   cd fruit_ecommerce
   git checkout claude/keen-brahmagupta-erlo45
   npm ci
   ```
2. Start a private Supabase on your computer (first time takes a few minutes). It creates the database, applies all migrations and loads the demo products:
   ```bash
   npx supabase start
   ```
   At the end it prints `API URL`, `anon key` and `service_role key`.
3. Create a file called `.env.local` in the project folder:
   ```
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from step 2>
   SUPABASE_SERVICE_ROLE_KEY=<service_role key from step 2>
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```
4. Start the website:
   ```bash
   npm run dev
   ```
   Open **http://localhost:3000**.
5. Make yourself the owner: sign up on the site, then open **http://127.0.0.1:54323** (Supabase Studio) → SQL Editor and run:
   ```sql
   update public.profiles set role = 'owner' where email = 'you@example.com';
   ```
   Use `'admin'` instead of `'owner'` for the full admin screens. Log out and in again, then go to http://localhost:3000/admin.

Notes
- Locally, sign-up logs you in straight away (no confirmation email). Any emails the app sends appear at http://127.0.0.1:54324.
- Photo uploads need the online (https) setup; locally you'll see the placeholder tiles.
- Stop everything with `Ctrl+C`, then `npx supabase stop`.
