/**
 * Checks if a value is null
 *
 * @param value - The value to test for null
 * @returns true if the value is null, false otherwise
 */


export class IsNull {
  static isNull(value: unknown): boolean   {
    return value === null;
  }
}
