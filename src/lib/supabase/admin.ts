import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Service-role client. BYPASSES Row Level Security, so it is used only for
 * the few server tasks that need it (rate limiting, account deletion).
 * Never import this from client code; `server-only` makes that a build error.
 */
export function createAdminClient() {
  const e = env();
  return createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
