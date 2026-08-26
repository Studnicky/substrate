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
    const number = Number(value);

    if (isNaN(number)) {
      return defaultValue;
    }

    return number;
  }
}
