/**
 * Checks if array is empty
 */


export function isEmptyArray(value: unknown): boolean {
  return Array.isArray(value) && value.length === 0;
}
