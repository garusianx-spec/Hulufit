import type { z } from "zod";
import { ApiError } from "./errors.js";

/**
 * One parse helper for every route: a payload either becomes a fully typed
 * value or a 400 that names the first thing wrong with it. No handler ever
 * reads an unvalidated field off `req`.
 */
export function parseOrThrow<S extends z.ZodTypeAny>(schema: S, input: unknown): z.infer<S> {
  const parsed = schema.safeParse(input);
  if (parsed.success) return parsed.data;

  const first = parsed.error.issues[0];
  throw ApiError.badRequest(
    "invalid_input",
    first?.message ?? "ورودی نامعتبر است.",
    parsed.error.issues,
  );
}
