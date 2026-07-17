/**
 * Safely converts any caught value to an Error instance.
 *
 * TypeScript 4+ types caught errors as `unknown`. Use this utility to
 * convert them to a typed `Error` without unsafe casts.
 */
export class ErrorGuard {
  public static ensureError(value: unknown): Error {
    if (value instanceof Error) {
      return value;
    }
    return new Error(String(value));
  }
}
