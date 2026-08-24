/**
 * Validates that both values are strings
 */


export function areStringsValid(value: unknown, filterValue: unknown): value is string {
  return typeof value === 'string' && typeof filterValue === 'string';
}
