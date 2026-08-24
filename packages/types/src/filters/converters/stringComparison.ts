/**
 * @module prepareStringComparison
 * @description Prepare string for case-insensitive comparison
 */

/**
 * Prepares a string for case-insensitive comparison
 * @param {*} value - Value to convert to string
 * @param {boolean} caseSensitive - Whether comparison should be case-sensitive
 * @param {string} [lowerValue] - Pre-computed lowercase value for optimization
 * @returns {string} Prepared string value
 */
function prepareStringComparison(value: unknown, caseSensitive: boolean, lowerValue: string | null = null): string {
  const str = String(value);

  return caseSensitive ? str : (lowerValue || str.toLowerCase());
}

export { prepareStringComparison };
