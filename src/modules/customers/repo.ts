import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface Address {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export async function listMyAddresses(userId: string): Promise<Address[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("addresses")
    .select("id, label, full_name, phone, line1, line2, landmark, city, state, pincode, is_default")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) throw new Error(`listMyAddresses: ${error.message}`);
  return data.map((a) => ({
    id: a.id,
    label: a.label,
    fullName: a.full_name,
    phone: a.phone,
    line1: a.line1,
    line2: a.line2,
    landmark: a.landmark,
    city: a.city,
    state: a.state,
    pincode: a.pincode,
    isDefault: a.is_default,
  }));
}
