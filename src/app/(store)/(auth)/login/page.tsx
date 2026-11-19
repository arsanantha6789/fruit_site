import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { Alert } from "@/components/ui/alert";
import { getCurrentUser } from "@/modules/auth/session";
import { safeNextPath } from "@/lib/utils";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in", robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = safeNextPath(sp.next, "");
  if (await getCurrentUser()) redirect(next || "/");
  return (
    <AuthCard
      title="Welcome back"
      subtitle="Log in to check out and track your orders."
      footer={
        <>
          New here?{" "}
          <Link href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-primary hover:text-forest">
            Create an account
          </Link>
        </>
      }
    >
      {sp.error === "link" && (
        <Alert tone="error" className="mb-5">
          That link has expired or was already used. Please try again.
        </Alert>
      )}
      <LoginForm next={next} />
    </AuthCard>
  );
}
