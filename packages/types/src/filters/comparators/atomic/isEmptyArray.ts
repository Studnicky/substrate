/**
 * Checks if array is empty
 */


export class IsEmptyArray {
  static isEmptyArray(value: unknown): boolean   {
    const result = Array.isArray(value) && value.length === 0;
    return result;
  }
}
