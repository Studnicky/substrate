/**
 * Checks if a value is strictly false
 */


export class IsFalse {
  static isFalse(value: unknown): boolean   {
    const result = value === false;
    return result;
  }
}
