import "server-only";
import { env } from "@/lib/env";

/** HTML-escape anything that came from users before putting it in an email. */
export function esc(s: string | null | undefined): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/**
 * Sends a transactional email through Resend when RESEND_API_KEY is set.
 * A future WhatsApp Business channel would sit next to this with the same
 * signature and be chosen in notifications/service.ts.
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const e = env();
  if (!e.RESEND_API_KEY || !e.EMAIL_FROM || !to) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${e.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: e.EMAIL_FROM, to: [to], subject, html }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Resend responded ${res.status}`);
    return true;
  } catch (err) {
    console.error(JSON.stringify({ level: "error", context: "sendEmail", message: (err as Error).message }));
    return false;
  }
}
