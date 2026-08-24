/**
 * Checks if string is empty
 */


export function isEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.length === 0;
}
