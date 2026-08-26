/**
 * Checks if a value is greater than another value
 *
 * Supports comparison of numbers, strings (lexicographic), and dates.
 *
 * @param value - The value to compare
 * @param comparison - The value to compare against
 * @returns true if value is greater than comparison, false otherwise
 */

export class IsGreaterThan {
  static isGreaterThan(value: unknown, comparison: unknown): boolean   {
    if (typeof value === 'number' && typeof comparison === 'number') {
      const result = value > comparison;
      return result;
    }

    if (typeof value === 'string' && typeof comparison === 'string') {
      const result = value > comparison;
      return result;
    }

    if (value instanceof Date && comparison instanceof Date) {
      const result = value.getTime() > comparison.getTime();
      return result;
    }

    return false;
  }
}
