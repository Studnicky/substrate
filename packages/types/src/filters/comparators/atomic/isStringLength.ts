/**
 * Checks if a string has a specific length
 */


/**
 * Checks if a value is a string with the specified length
 * @param value - The value to check
 * @param length - The expected length
 * @returns true if value is a string with the specified length, false otherwise
 */
export function isStringLength(value: unknown, length: number): boolean {
  return typeof value === 'string' && value.length === length;
}
