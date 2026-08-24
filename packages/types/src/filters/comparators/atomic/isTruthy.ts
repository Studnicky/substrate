/**
 * Checks if a value is truthy (converts to true in boolean context)
 */


export function isTruthy(value: unknown): boolean {
  return Boolean(value);
}
