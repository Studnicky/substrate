/**
 * @module StringComparisonPreparer
 * @description Prepare string for case-insensitive comparison
 */

/**
 * Prepare string for case-insensitive comparison
 */
export class StringComparisonPreparer {
  /**
   * Prepares a string for case-insensitive comparison
   * @param {*} value - Value to convert to string
   * @param {boolean} caseSensitive - Whether comparison should be case-sensitive
   * @param {string} [lowerValue] - Pre-computed lowercase value for optimization
   * @returns {string} Prepared string value
   */
  static prepareStringComparison(value: unknown, caseSensitive: boolean, lowerValue: string | null = null): string {
    const stringValue = String(value);

    if (caseSensitive) {
      return stringValue;
    }

    const result = lowerValue !== null && lowerValue !== '' ? lowerValue : stringValue.toLowerCase();

    return result;
  }
}
