/**
 * Checks if a number is an integer
 */


/**
 * Checks if a value is an integer
 * @param value - The value to check
 * @returns true if value is an integer, false otherwise
 */
export function isInteger(value: unknown): boolean {
  return typeof value === 'number' && Number.isInteger(value);
}
