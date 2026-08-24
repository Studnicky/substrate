/**
 * Checks if two values are not strictly equal using Object.is semantics
 */


export function areNotStrictlyEqual(value: unknown, filterValue: unknown): boolean {
  return !Object.is(value, filterValue);
}
