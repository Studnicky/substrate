/**
 * Checks if a value is undefined
 *
 * @param value - The value to test for undefined
 * @returns true if the value is undefined, false otherwise
 */


export class IsUndefined {
  static isUndefined(value: unknown): boolean   {
    const result = value === undefined;
    return result;
  }
}
