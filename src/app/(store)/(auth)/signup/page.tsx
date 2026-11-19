import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { getCurrentUser } from "@/modules/auth/session";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Create account", robots: { index: false } };

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/");
  return (
    <AuthCard
      title="Create your account"
      subtitle="Order in under a minute and track every delivery."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-primary hover:text-forest">
            Log in
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthCard>
  );
}
