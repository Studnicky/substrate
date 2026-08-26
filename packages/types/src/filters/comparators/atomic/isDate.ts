/**
 * Checks if a value is a Date instance
 *
 * @param value - The value to test for Date instance
 * @returns true if the value is a Date instance, false otherwise
 */


export class IsDate {
  static isDate(value: unknown): value is Date   {
    const result = value instanceof Date;
    return result;
  }
}
