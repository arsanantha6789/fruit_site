import { z } from "zod";

export const emailField = z.string().trim().toLowerCase().email("Enter a valid email address").max(200);
export const passwordField = z
  .string()
  .min(8, "Use at least 8 characters")
  .refine((p) => new TextEncoder().encode(p).length <= 72, "Password is too long");
export const indianPhone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, "").replace(/^(\+91|91|0)(?=[6-9]\d{9}$)/, ""))
  .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number"));

export const LoginInput = z.object({ email: emailField, password: z.string().min(1, "Enter your password").max(200) }).strict();

export const SignupInput = z
  .object({
    fullName: z.string().trim().min(2, "Enter your name").max(120),
    email: emailField,
    phone: indianPhone,
    password: passwordField,
    acceptTerms: z.literal("on", { message: "Please accept the Terms and Privacy Policy" }),
  })
  .strict();

export const ForgotPasswordInput = z.object({ email: emailField }).strict();

export const ResetPasswordInput = z
  .object({ password: passwordField, confirm: z.string() })
  .strict()
  .refine((d) => d.password === d.confirm, { message: "Passwords don't match", path: ["confirm"] });
