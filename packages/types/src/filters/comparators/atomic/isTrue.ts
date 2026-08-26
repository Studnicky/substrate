/**
 * Checks if a value is strictly true
 */


export class IsTrue {
  static isTrue(value: unknown): boolean   {
    const result = value === true;
    return result;
  }
}
