/**
 * Checks if a number is finite
 */


/**
 * Checks if a value is a finite number (not Infinity or -Infinity)
 * @param value - The value to check
 * @returns true if value is a finite number, false otherwise
 */
export class IsFinite {
  static isFinite(value: unknown): boolean   {
    return typeof value === 'number' && Number.isFinite(value);
  }
}
