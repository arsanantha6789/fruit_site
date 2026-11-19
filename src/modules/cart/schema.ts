import { z } from "zod";

export const MAX_LINES = 50;
export const MAX_QTY = 50;

export const CartLine = z.object({ variantId: z.string().uuid(), quantity: z.number().int().min(1).max(MAX_QTY) }).strict();
export const CartLines = z.array(CartLine).max(MAX_LINES);
export type CartLineInput = z.infer<typeof CartLine>;
