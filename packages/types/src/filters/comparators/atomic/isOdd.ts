/**
 * Checks if a number is odd
 */


/**
 * Checks if a value is an odd number
 * @param value - The value to check
 * @returns true if value is an odd number, false otherwise
 */
export class IsOdd {
  static isOdd(value: unknown): boolean   {
    return typeof value === 'number' && Number.isFinite(value) && Math.abs(value % 2) === 1;
  }
}
