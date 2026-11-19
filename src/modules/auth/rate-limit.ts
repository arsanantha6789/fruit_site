import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/** Client IP as reported by the hosting platform (Vercel sets x-real-ip / x-forwarded-for). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

const hash = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 32);

/**
 * Database-backed fixed-window limiter (works across serverless instances).
 * Keys are hashed so no raw emails/IPs are stored. Fails OPEN on database
 * errors so an outage of the limiter doesn't lock everybody out.
 */
export async function rateLimit(bucket: string, identifier: string, max: number, windowSeconds: number): Promise<boolean> {
  try {
    const { data, error } = await createAdminClient().rpc("rate_limit_hit", {
      p_key: `${bucket}:${hash(identifier)}`,
      p_window_seconds: windowSeconds,
      p_max: max,
    });
    if (error) throw error;
    return data === true;
  } catch (err) {
    console.error(JSON.stringify({ level: "error", context: "rateLimit", bucket, message: (err as Error).message }));
    return true;
  }
}

export const LIMITS = {
  login: { max: 10, window: 15 * 60 },
  signup: { max: 5, window: 60 * 60 },
  passwordResetIp: { max: 5, window: 60 * 60 },
  passwordResetEmail: { max: 3, window: 60 * 60 },
  resendVerification: { max: 3, window: 60 * 60 },
  deleteAccount: { max: 5, window: 60 * 60 },
  imageUpload: { max: 60, window: 60 * 60 },
} as const;
