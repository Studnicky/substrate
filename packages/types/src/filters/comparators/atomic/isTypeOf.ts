/**
 * Checks if a value has a specific typeof result
 */


/**
 * Checks if a value has the specified typeof result
 * @param value - The value to check
 * @param type - The expected typeof result ('string', 'number', 'boolean', 'object', 'function', 'symbol', 'undefined', 'bigint')
 * @returns true if typeof value equals the specified type, false otherwise
 */
export function isTypeOf(value: unknown, type: string): boolean {
  return typeof value === type;
}
