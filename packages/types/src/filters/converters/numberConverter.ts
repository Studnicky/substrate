/**
 * @module NumberConverter
 * @description Safe number conversion with validation
 */

/**
 * Safe number conversion with validation
 */
export class NumberConverter {
  /**
   * Safely converts a value to a number with validation
   * @param {*} value - Value to convert
   * @param {*} defaultValue - Default value if conversion fails
   * @returns {number} Numeric value or default
   */
  static numberConverter(value: unknown, defaultValue = NaN): number {
    if (value === undefined) {
      return defaultValue;
    }
    const num = Number(value);

    if (isNaN(num)) {
      return defaultValue;
    }

    return num;
  }
}
