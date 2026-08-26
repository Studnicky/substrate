/**
 * Checks if a value is less than another value
 */

export class IsLessThan {
  static isLessThan(value: unknown, comparison: unknown): boolean   {
    if (typeof value === 'number' && typeof comparison === 'number') {
      const result = value < comparison;
      return result;
    }

    if (typeof value === 'string' && typeof comparison === 'string') {
      const result = value < comparison;
      return result;
    }

    if (value instanceof Date && comparison instanceof Date) {
      const result = value.getTime() < comparison.getTime();
      return result;
    }

    return false;
  }
}
