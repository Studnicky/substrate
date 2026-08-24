/**
 * Checks if a string contains only alphanumeric characters
 */


/**
 * Checks if a value is a string containing only letters and numbers
 * @param value - The value to check
 * @returns true if value is alphanumeric, false otherwise
 */
export function isAlphanumeric(value: unknown): boolean {
  return typeof value === 'string' && /^[a-zA-Z0-9]+$/.test(value);
}
