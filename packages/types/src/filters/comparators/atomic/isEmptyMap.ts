/**
 * Checks if Map is empty
 */

export class IsEmptyMap {
  static isEmptyMap(value: unknown): boolean   {
    const result = value instanceof Map && value.size === 0;
    return result;
  }
}
