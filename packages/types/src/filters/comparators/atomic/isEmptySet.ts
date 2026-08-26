/**
 * Checks if Set is empty
 */

export class IsEmptySet {
  static isEmptySet(value: unknown): boolean   {
    const result = value instanceof Set && value.size === 0;
    return result;
  }
}
