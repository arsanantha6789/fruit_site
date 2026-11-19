import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { Alert } from "@/components/ui/alert";
import { getCurrentUser } from "@/modules/auth/session";
import { ResetPasswordForm } from "./reset-form";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default async function ResetPasswordPage() {
  const user = await getCurrentUser();
  return (
    <AuthCard title="Choose a new password">
      {user ? (
        <ResetPasswordForm />
      ) : (
        <Alert tone="error">
          This reset link has expired or was already used.{" "}
          <Link href="/forgot-password" className="underline">
            Request a new one
          </Link>
          .
        </Alert>
      )}
    </AuthCard>
  );
}
