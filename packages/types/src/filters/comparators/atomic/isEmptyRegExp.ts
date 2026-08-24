/**
 * Checks if RegExp has an empty pattern
 */

export class IsEmptyRegExp {
  static isEmptyRegExp(value: unknown): boolean   {
    return value instanceof RegExp && value.source === '(?:)';
  }
}
