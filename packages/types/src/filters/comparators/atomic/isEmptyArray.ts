/**
 * Checks if array is empty
 */


export class IsEmptyArray {
  static isEmptyArray(value: unknown): boolean   {
    return Array.isArray(value) && value.length === 0;
  }
}
