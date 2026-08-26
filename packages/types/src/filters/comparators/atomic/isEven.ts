/**
 * Checks if a number is even
 */


/**
 * Checks if a value is an even number
 * @param value - The value to check
 * @returns true if value is an even number, false otherwise
 */
export class IsEven {
  static isEven(value: unknown): boolean   {
    const result = typeof value === 'number' && Number.isFinite(value) && value % 2 === 0;
    return result;
  }
}
