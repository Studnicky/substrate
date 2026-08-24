/**
 * Checks if Map is empty
 */

export class IsEmptyMap {
  static isEmptyMap(value: unknown): boolean   {
    return value instanceof Map && value.size === 0;
  }
}
