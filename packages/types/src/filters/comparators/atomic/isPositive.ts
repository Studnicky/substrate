/**
 * Checks if a number is positive
 */


/**
 * Checks if a value is a positive number (> 0)
 * @param value - The value to check
 * @returns true if value is a positive number, false otherwise
 */
export class IsPositive {
  static isPositive(value: unknown): boolean   {
    const result = typeof value === 'number' && value > 0;
    return result;
  }
}
