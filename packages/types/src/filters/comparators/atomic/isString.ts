/**
 * Checks if a value is a string
 *
 * @param value - The value to test for string type
 * @returns true if the value is a string, false otherwise
 */


export class IsString {
  static isString(value: unknown): value is string   {
    return typeof value === 'string';
  }
}
