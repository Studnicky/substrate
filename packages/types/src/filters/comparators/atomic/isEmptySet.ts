/**
 * Checks if Set is empty
 */

export function isEmptySet(value: unknown): boolean {
  return value instanceof Set && value.size === 0;
}
