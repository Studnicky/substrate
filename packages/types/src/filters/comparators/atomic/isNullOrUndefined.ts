/**
 * Checks if value is null or undefined
 *
 * @param value - The value to test for null or undefined
 * @returns true if the value is null or undefined, false otherwise
 */


export function isNullOrUndefined(value: unknown): boolean {
  return value === null || value === undefined;
}
