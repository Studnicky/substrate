/**
 * Checks if string is empty
 */


export class IsEmptyString {
  static isEmptyString(value: unknown): boolean   {
    const result = typeof value === 'string' && value.length === 0;
    return result;
  }
}
