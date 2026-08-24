/**
 * Checks if a number is positive
 */


/**
 * Checks if a value is a positive number (> 0)
 * @param value - The value to check
 * @returns true if value is a positive number, false otherwise
 */
export function isPositive(value: unknown): boolean {
  return typeof value === 'number' && value > 0;
}
