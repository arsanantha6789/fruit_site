import { NextResponse } from "next/server";
import { z } from "zod";
import { staffOrNull } from "@/modules/auth/session";
import { markStaffNotificationsRead, unreadStaffNotifications } from "@/modules/notifications/repo";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store" };

/** Polled by the dashboard every ~20s for new-order alerts. Staff only. */
export async function GET() {
  if (!(await staffOrNull())) return NextResponse.json({ error: "Not allowed" }, { status: 403, headers: noStore });
  try {
    return NextResponse.json(await unreadStaffNotifications(), { headers: noStore });
  } catch (err) {
    console.error(JSON.stringify({ level: "error", context: "notifications.GET", message: (err as Error).message }));
    return NextResponse.json({ error: "Couldn't load notifications" }, { status: 500, headers: noStore });
  }
}

const MarkRead = z.object({ ids: z.array(z.string().uuid()).max(100).optional() }).strict();

export async function POST(request: Request) {
  if (!(await staffOrNull())) return NextResponse.json({ error: "Not allowed" }, { status: 403, headers: noStore });
  const body = await request.json().catch(() => null);
  const parsed = MarkRead.safeParse(body ?? {});
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400, headers: noStore });
  try {
    await markStaffNotificationsRead(parsed.data.ids);
    return NextResponse.json({ ok: true }, { headers: noStore });
  } catch {
    return NextResponse.json({ error: "Couldn't update notifications" }, { status: 500, headers: noStore });
  }
}
