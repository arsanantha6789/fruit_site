import type { z } from "zod";

/**
 * Reads ONLY the listed fields from a form submission (anything else,
 * e.g. a sneaky `role=admin`, is ignored) and validates them with zod.
 */
export function parseForm<S extends z.ZodType>(
  schema: S,
  formData: FormData,
  fields: readonly string[],
): { success: true; data: z.infer<S> } | { success: false; fieldErrors: Record<string, string[] | undefined> } {
  const raw: Record<string, unknown> = {};
  for (const f of fields) {
    const v = formData.get(f);
    if (v !== null && typeof v === "string") raw[f] = v;
  }
  const r = schema.safeParse(raw);
  if (r.success) return { success: true, data: r.data };
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of r.error.issues) {
    const key = String(issue.path[0] ?? "form");
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return { success: false, fieldErrors };
}
