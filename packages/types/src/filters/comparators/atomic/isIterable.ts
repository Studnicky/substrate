/**
 * Checks if a value implements the iterable protocol
 */


/**
 * Checks if a value is iterable (has Symbol.iterator)
 * @param value - The value to check
 * @returns true if value is iterable, false otherwise
 */
export function isIterable(value: unknown): boolean {
  return value !== null && value !== undefined && typeof (value as Record<string | symbol, unknown>)[Symbol.iterator] === 'function';
}
