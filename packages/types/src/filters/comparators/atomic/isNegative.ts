/**
 * Checks if a number is negative
 */


/**
 * Checks if a value is a negative number (< 0)
 * @param value - The value to check
 * @returns true if value is a negative number, false otherwise
 */
export function isNegative(value: unknown): boolean {
  return typeof value === 'number' && value < 0;
}
