import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface StaffNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  orderId: string | null;
  createdAt: string;
}

export async function unreadStaffNotifications(limit = 10): Promise<{ items: StaffNotification[]; count: number }> {
  const supabase = await createClient();
  const { data, error, count } = await supabase
    .from("notifications")
    .select("id, type, title, body, order_id, created_at", { count: "exact" })
    .eq("audience", "staff")
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`unreadStaffNotifications: ${error.message}`);
  return {
    count: count ?? 0,
    items: data.map((n) => ({ id: n.id, type: n.type, title: n.title, body: n.body, orderId: n.order_id, createdAt: n.created_at })),
  };
}

export async function markStaffNotificationsRead(ids?: string[]): Promise<void> {
  const supabase = await createClient();
  let q = supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("audience", "staff").is("read_at", null);
  if (ids?.length) q = q.in("id", ids);
  const { error } = await q;
  if (error) throw new Error(`markStaffNotificationsRead: ${error.message}`);
}
