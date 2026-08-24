/**
 * Checks if values have the same primitive type using typeof
 */


export function areTypesSame(value: unknown, filterValue: unknown): boolean {
  return typeof value === typeof filterValue;
}
