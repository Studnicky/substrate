/**
 * Checks if a value is callable (function or constructor)
 */


/**
 * Checks if a value can be called as a function
 * @param value - The value to check
 * @returns true if value is callable, false otherwise
 */
export function isCallable(value: unknown): boolean {
  return typeof value === 'function';
}
