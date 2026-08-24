/**
 * Checks if Set is empty
 */

export class IsEmptySet {
  static isEmptySet(value: unknown): boolean   {
    return value instanceof Set && value.size === 0;
  }
}
