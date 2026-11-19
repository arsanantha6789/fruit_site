import "server-only";
import { z } from "zod";

/**
 * Server configuration, validated once at startup. The app refuses to run
 * with missing or malformed values instead of failing later at random.
 * Only NEXT_PUBLIC_* values are ever sent to the browser.
 */
const Env = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20, "SUPABASE_SERVICE_ROLE_KEY is required (server only)"),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  OWNER_NOTIFICATION_EMAIL: z.string().email().optional().or(z.literal("")),
});

export type ServerEnv = z.infer<typeof Env>;

let cached: ServerEnv | null = null;

export function env(): ServerEnv {
  if (cached) return cached;
  const parsed = Env.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid server configuration. ${missing}`);
  }
  cached = parsed.data;
  return cached;
}
