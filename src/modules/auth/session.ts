import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AppRole = "customer" | "owner" | "admin";

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: AppRole;
}

/**
 * Data Access Layer entry point: the ONLY place the app decides who the
 * visitor is. Verifies the JWT (getClaims) and loads the role from the
 * database (never from user-editable metadata). Cached per request.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  if (error || !sub) return null;
  const { data: profile } = await supabase.from("profiles").select("id, email, full_name, phone, role").eq("id", sub).maybeSingle();
  if (!profile) return null;
  return {
    id: profile.id,
    email: profile.email ?? String(data.claims.email ?? ""),
    fullName: profile.full_name,
    phone: profile.phone,
    role: profile.role as AppRole,
  };
});

export function isStaffRole(role: AppRole | undefined): boolean {
  return role === "owner" || role === "admin";
}

/** Pages: redirect to login when signed out. */
export async function requireUser(nextPath = "/"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return user;
}

/** Pages: staff only. Non-staff get a 404 so the admin area isn't advertised. */
export async function requireStaffPage(): Promise<CurrentUser> {
  const user = await requireUser("/admin");
  if (!isStaffRole(user.role)) notFound();
  return user;
}

export async function requireAdminPage(): Promise<CurrentUser> {
  const user = await requireUser("/admin");
  if (user.role !== "admin") notFound();
  return user;
}

/** Server Actions: return null instead of redirecting so the UI can show a message. */
export async function staffOrNull(): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  return user && isStaffRole(user.role) ? user : null;
}

export async function adminOrNull(): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  return user?.role === "admin" ? user : null;
}
