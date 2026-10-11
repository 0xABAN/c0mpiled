import type { z } from "zod";

import { UserError } from "./errors";

/**
 * Validates untrusted input (server action arguments come straight from the browser).
 * Throws a `UserError` with the first problem, so the form can show it.
 */
export function parseInput<Schema extends z.ZodType>(schema: Schema, input: unknown): z.infer<Schema> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  const [issue] = result.error.issues;
  const field = issue.path.join(".");
  throw new UserError(field ? `${field}: ${issue.message}` : issue.message);
}
