import type { ActionResult } from "@/lib/action-result";
import { Alert } from "./alert";

/** Shows the top-level result of a Server Action form. */
export function FormMessage({ state }: { state: ActionResult<unknown> | null }) {
  if (!state) return null;
  if (!state.ok) return <Alert tone="error">{state.error}</Alert>;
  return state.message ? <Alert tone="success">{state.message}</Alert> : null;
}
