/**
 * Checks if RegExp has an empty pattern
 */

export function isEmptyRegExp(value: unknown): boolean {
  return value instanceof RegExp && value.source === '(?:)';
}
