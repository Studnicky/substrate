/**
 * Checks if a value is less than or equal to another value
 */

export class IsLessThanOrEqual {
  static isLessThanOrEqual(value: unknown, comparison: unknown): boolean   {
    if (typeof value === 'number' && typeof comparison === 'number') {
      const result = value <= comparison;
      return result;
    }

    if (typeof value === 'string' && typeof comparison === 'string') {
      const result = value <= comparison;
      return result;
    }

    if (value instanceof Date && comparison instanceof Date) {
      const result = value.getTime() <= comparison.getTime();
      return result;
    }

    return false;
  }
}
