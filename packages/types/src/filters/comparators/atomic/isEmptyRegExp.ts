/**
 * Checks if RegExp has an empty pattern
 */

export class IsEmptyRegExp {
  static isEmptyRegExp(value: unknown): boolean   {
    const result = value instanceof RegExp && value.source === '(?:)';
    return result;
  }
}
