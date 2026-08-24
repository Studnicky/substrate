/**
 * Checks if Map is empty
 */

export function isEmptyMap(value: unknown): boolean {
  return value instanceof Map && value.size === 0;
}
