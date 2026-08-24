/**
 * Checks if a value is a number
 *
 * @param value - The value to test for number type
 * @returns true if the value is a number, false otherwise
 */


export function isNumber(value: unknown): value is number {
  return typeof value === 'number';
}
