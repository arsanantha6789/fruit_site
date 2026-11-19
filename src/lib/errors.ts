import "server-only";
import { formatINR } from "@/lib/money";

type DbError = { message?: string; details?: string; code?: string } | null | undefined;

/**
 * Turns database/RPC errors into plain-language messages. Unknown errors
 * are logged on the server and the user gets a generic message with a
 * reference ID; raw SQL/stack details never reach the browser.
 */
export function friendlyDbError(error: DbError, context: string): string {
  const code = error?.message ?? "";
  const detail = error?.details ?? "";
  switch (code) {
    case "AUTH_REQUIRED":
      return "Please log in to continue.";
    case "FORBIDDEN":
      return "You don't have permission to do that.";
    case "NOT_FOUND":
      return "We couldn't find that. It may have been removed.";
    case "OUT_OF_STOCK":
      return `Sorry, we don't have enough ${detail || "of an item"} left. Please reduce the quantity or remove it.`;
    case "PRODUCT_UNAVAILABLE":
      return `${detail || "An item in your cart"} is no longer available. Please remove it to continue.`;
    case "STORE_CLOSED":
      return "We're not taking orders right now. Please try again later.";
    case "PINCODE_NOT_SERVICEABLE":
      return `Sorry, we don't deliver to pincode ${detail} yet.`;
    case "BELOW_MINIMUM_ORDER":
      return `The minimum order value is ${formatINR(Number(detail) || 0)}.`;
    case "TOO_MANY_ORDERS":
      return "You've placed several orders in a short time. Please wait a few minutes and try again.";
    case "PAYMENT_METHOD_UNAVAILABLE":
      return "That payment method isn't available right now. Please choose another.";
    case "INVALID_TRANSITION":
      return "Orders can only move forward. Refresh the page to see the latest status.";
    case "ORDER_CLOSED":
      return "This order is already delivered or cancelled, so it can't be changed.";
    case "CANNOT_CANCEL":
      return "This order is already being prepared, so it can't be cancelled online. Please call the store.";
    case "INVALID_INPUT":
      return "Some details look incorrect. Please check the form and try again.";
  }
  if (error?.code === "23505") return "That already exists. Please use a different name or link.";
  if (error?.code === "23503") return "This is still in use elsewhere, so it can't be removed.";
  if (error?.code === "42501") return "You don't have permission to do that.";
  const ref = Math.random().toString(36).slice(2, 10).toUpperCase();
  console.error(JSON.stringify({ level: "error", ref, context, code: error?.code, message: error?.message }));
  return `Something went wrong on our side. Please try again. (Ref ${ref})`;
}
