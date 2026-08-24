/**
 * Shared range comparison logic for different data types
 */

export class PerformRangeComparison {
  /**
   * Checks if all values are numbers and performs numeric range comparison
   */
  private static compareNumericRange(value: unknown, min: unknown, max: unknown, inclusive: boolean): boolean | null {
    if (typeof value === 'number' && typeof min === 'number' && typeof max === 'number') {
      return inclusive
        ? value >= min && value <= max
        : value < min || value > max;
    }

    return null;
  }

  /**
   * Checks if all values are Dates and performs date range comparison
   */
  private static compareDateRange(value: unknown, min: unknown, max: unknown, inclusive: boolean): boolean | null {
    if (value instanceof Date && min instanceof Date && max instanceof Date) {
      const valueTime = value.getTime();
      const minTime = min.getTime();
      const maxTime = max.getTime();

      return inclusive
        ? valueTime >= minTime && valueTime <= maxTime
        : valueTime < minTime || valueTime > maxTime;
    }

    return null;
  }

  /**
   * Checks if all values are strings and performs lexicographic range comparison
   */
  private static compareStringRange(value: unknown, min: unknown, max: unknown, inclusive: boolean): boolean | null {
    if (typeof value === 'string' && typeof min === 'string' && typeof max === 'string') {
      return inclusive
        ? value >= min && value <= max
        : value < min || value > max;
    }

    return null;
  }

  /**
   * Performs range comparison with type checking for multiple data types
   * @param value - The value to check
   * @param min - The minimum value of the range
   * @param max - The maximum value of the range
   * @param inclusive - Whether to include boundaries (true for >=/<= , false for >/<)
   * @returns true if value is in range (inclusive) or outside range (!inclusive)
   */
  static performRangeComparison(value: unknown, min: unknown, max: unknown, inclusive: boolean): boolean {
    // Try numeric comparison
    const numericResult = PerformRangeComparison.compareNumericRange(value, min, max, inclusive);

    if (numericResult !== null) {
      return numericResult;
    }

    // Try date comparison
    const dateResult = PerformRangeComparison.compareDateRange(value, min, max, inclusive);

    if (dateResult !== null) {
      return dateResult;
    }

    // Try string comparison
    const stringResult = PerformRangeComparison.compareStringRange(value, min, max, inclusive);

    if (stringResult !== null) {
      return stringResult;
    }

    // Type mismatch or unsupported types
    return inclusive ? false : true;
  }
}
