/**
 * Checks if value is null or undefined
 *
 * @param value - The value to test for null or undefined
 * @returns true if the value is null or undefined, false otherwise
 */


export class IsNullOrUndefined {
  static isNullOrUndefined(value: unknown): boolean   {
    const result = value === null || value === undefined;
    return result;
  }
}
