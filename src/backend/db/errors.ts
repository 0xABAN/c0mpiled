/** Whether `error` (as thrown by Drizzle or pg) is a unique violation of `constraint`. */
export function isUniqueViolation(error: unknown, constraint: string): boolean {
  // Drizzle wraps the pg error in `cause`; pg's own errors carry the fields directly.
  const pgError = (error instanceof Error && error.cause ? error.cause : error) as { code?: string; constraint?: string };
  return pgError?.code === "23505" && pgError.constraint === constraint;
}
