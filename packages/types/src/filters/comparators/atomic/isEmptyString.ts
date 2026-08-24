/**
 * Checks if string is empty
 */


export class IsEmptyString {
  static isEmptyString(value: unknown): boolean   {
    return typeof value === 'string' && value.length === 0;
  }
}
