/**
 * Shared range comparison logic for different data types
 */

export class PerformRangeComparison {
  /**
   * Checks if all values are numbers and performs numeric range comparison
   */
  private static compareNumericRange(value: unknown, minimum: unknown, maximum: unknown, inclusive: boolean): boolean | null {
    if (typeof value === 'number' && typeof minimum === 'number' && typeof maximum === 'number') {
      const result = inclusive
        ? value >= minimum && value <= maximum
        : value < minimum || value > maximum;

      return result;
    }

    return null;
  }

  /**
   * Checks if all values are Dates and performs date range comparison
   */
  private static compareDateRange(value: unknown, minimum: unknown, maximum: unknown, inclusive: boolean): boolean | null {
    if (value instanceof Date && minimum instanceof Date && maximum instanceof Date) {
      const valueTime = value.getTime();
      const minimumTime = minimum.getTime();
      const maximumTime = maximum.getTime();

      const result = inclusive
        ? valueTime >= minimumTime && valueTime <= maximumTime
        : valueTime < minimumTime || valueTime > maximumTime;

      return result;
    }

    return null;
  }

  /**
   * Checks if all values are strings and performs lexicographic range comparison
   */
  private static compareStringRange(value: unknown, minimum: unknown, maximum: unknown, inclusive: boolean): boolean | null {
    if (typeof value === 'string' && typeof minimum === 'string' && typeof maximum === 'string') {
      const result = inclusive
        ? value >= minimum && value <= maximum
        : value < minimum || value > maximum;

      return result;
    }

    return null;
  }

  /**
   * Performs range comparison with type checking for multiple data types
   * @param value - The value to check
   * @param minimum - The minimum value of the range
   * @param maximum - The maximum value of the range
   * @param inclusive - Whether to include boundaries (true for >=/<= , false for >/<)
   * @returns true if value is in range (inclusive) or outside range (!inclusive)
   */
  static performRangeComparison(value: unknown, minimum: unknown, maximum: unknown, inclusive: boolean): boolean {
    // Try numeric comparison
    const numericResult = PerformRangeComparison.compareNumericRange(value, minimum, maximum, inclusive);

    if (numericResult !== null) {
      return numericResult;
    }

    // Try date comparison
    const dateResult = PerformRangeComparison.compareDateRange(value, minimum, maximum, inclusive);

    if (dateResult !== null) {
      return dateResult;
    }

    // Try string comparison
    const stringResult = PerformRangeComparison.compareStringRange(value, minimum, maximum, inclusive);

    if (stringResult !== null) {
      return stringResult;
    }

    // Type mismatch or unsupported types
    const result = inclusive ? false : true;

    return result;
  }
}
