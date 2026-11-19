"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { parseForm } from "@/lib/form";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { safeNextPath } from "@/lib/utils";
import { clientIp, LIMITS, rateLimit } from "./rate-limit";
import { getCurrentUser } from "./session";
import { ForgotPasswordInput, LoginInput, ResetPasswordInput, SignupInput, passwordField } from "./schema";

const TOO_MANY = "Too many attempts. Please wait a few minutes and try again.";

export async function loginAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = parseForm(LoginInput, formData, ["email", "password"]);
  if (!parsed.success) return fail("Please check the highlighted fields.", parsed.fieldErrors);
  if (!(await rateLimit("login", await clientIp(), LIMITS.login.max, LIMITS.login.window))) return fail(TOO_MANY);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "email_not_confirmed") {
      return fail("Please verify your email first. Check your inbox for the confirmation link.");
    }
    return fail("Wrong email or password.");
  }
  const user = await getCurrentUser();
  const fallback = user && (user.role === "owner" || user.role === "admin") ? "/admin" : "/";
  redirect(safeNextPath(formData.get("next"), fallback));
}

export async function signupAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = parseForm(SignupInput, formData, ["fullName", "email", "phone", "password", "acceptTerms"]);
  if (!parsed.success) return fail("Please check the highlighted fields.", parsed.fieldErrors);
  if (!(await rateLimit("signup", await clientIp(), LIMITS.signup.max, LIMITS.signup.window))) return fail(TOO_MANY);

  const supabase = await createClient();
  const { fullName, email, phone, password } = parsed.data;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, phone },
      emailRedirectTo: `${env().NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/`,
    },
  });
  if (error) {
    if (error.code === "weak_password") return fail("Please choose a stronger password.", { password: [error.message] });
    if (error.code === "over_email_send_rate_limit") return fail(TOO_MANY);
    console.error(JSON.stringify({ level: "error", context: "signup", code: error.code }));
    return fail("We couldn't create your account right now. Please try again.");
  }
  // Projects with email confirmation switched off get a session straight away.
  if (data.session) redirect("/account");
  // Same response whether or not the email was already registered (no account enumeration).
  return ok(undefined, "Almost there! We've sent a confirmation link to your email. Open it to activate your account.");
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function forgotPasswordAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = parseForm(ForgotPasswordInput, formData, ["email"]);
  if (!parsed.success) return fail("Please enter a valid email.", parsed.fieldErrors);
  const ipOk = await rateLimit("reset-ip", await clientIp(), LIMITS.passwordResetIp.max, LIMITS.passwordResetIp.window);
  const emailOk = await rateLimit("reset-email", parsed.data.email, LIMITS.passwordResetEmail.max, LIMITS.passwordResetEmail.window);
  if (!ipOk) return fail(TOO_MANY);

  if (emailOk) {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${env().NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/reset-password`,
    });
    if (error) console.error(JSON.stringify({ level: "warn", context: "resetPassword", code: error.code }));
  }
  return ok(undefined, "If an account exists for that email, a reset link is on its way. It expires soon, so use it quickly.");
}

/** Used after following the emailed recovery link (session comes from /auth/confirm). */
export async function resetPasswordAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = parseForm(ResetPasswordInput, formData, ["password", "confirm"]);
  if (!parsed.success) return fail("Please check the highlighted fields.", parsed.fieldErrors);
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return fail("Your reset link has expired. Please request a new one.");
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return fail("Please choose a password you haven't used here before.");
    return fail("We couldn't update your password. Please request a new reset link.");
  }
  await supabase.auth.signOut({ scope: "others" });
  return ok(undefined, "Your password has been changed. Other devices have been signed out.");
}

export async function changePasswordAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("Please log in again.");
  const current = String(formData.get("current") ?? "");
  const next = passwordField.safeParse(formData.get("password"));
  if (!next.success) return fail("Please check the highlighted fields.", { password: next.error.issues.map((i) => i.message) });
  if (formData.get("confirm") !== next.data) return fail("Please check the highlighted fields.", { confirm: ["Passwords don't match"] });
  if (!(await rateLimit("login", await clientIp(), LIMITS.login.max, LIMITS.login.window))) return fail(TOO_MANY);

  const supabase = await createClient();
  const { error: authError } = await supabase.auth.signInWithPassword({ email: user.email, password: current });
  if (authError) return fail("Your current password is incorrect.", { current: ["Incorrect password"] });
  const { error } = await supabase.auth.updateUser({ password: next.data });
  if (error) return fail("We couldn't update your password. Please try a different one.");
  await supabase.auth.signOut({ scope: "others" });
  return ok(undefined, "Password updated. Other devices have been signed out.");
}

/**
 * Permanently deletes the account after re-checking the password.
 * Orders are kept for the shop's accounting but detached from the user
 * and stripped of personal details (see anonymise step below).
 */
export async function deleteAccountAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("Please log in again.");
  if (user.role !== "customer") return fail("Staff accounts must be removed by an administrator.");
  if (formData.get("confirmText") !== "DELETE") return fail("Type DELETE to confirm.", { confirmText: ["Type DELETE"] });
  if (!(await rateLimit("delete", user.id, LIMITS.deleteAccount.max, LIMITS.deleteAccount.window))) return fail(TOO_MANY);

  const supabase = await createClient();
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: String(formData.get("password") ?? ""),
  });
  if (authError) return fail("Your password is incorrect.", { password: ["Incorrect password"] });

  const admin = createAdminClient();
  const { count } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", user.id)
    .not("status", "in", "(delivered,cancelled)");
  if ((count ?? 0) > 0) {
    return fail("You have an order in progress. Please wait until it's delivered (or cancel it) before deleting your account.");
  }
  const { error: anonError } = await admin
    .from("orders")
    .update({
      customer_name: "Deleted customer",
      customer_phone: "9000000000",
      customer_email: null,
      instructions: "",
      shipping_address: { removed: true },
    })
    .eq("customer_id", user.id)
    .in("status", ["delivered", "cancelled"]);
  if (anonError) {
    console.error(JSON.stringify({ level: "error", context: "deleteAccount.anonymise", code: anonError.code }));
    return fail("We couldn't delete your account right now. Please try again.");
  }
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error(JSON.stringify({ level: "error", context: "deleteAccount", code: error.code }));
    return fail("We couldn't delete your account right now. Please try again.");
  }
  await supabase.auth.signOut();
  console.info(JSON.stringify({ level: "info", event: "account_deleted" }));
  redirect("/?account=deleted");
}
