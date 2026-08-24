/**
 * @module numberConverter
 * @description Safe number conversion with validation
 */


/**
 * Safely converts a value to a number with validation
 * @param {*} value - Value to convert
 * @param {*} defaultValue - Default value if conversion fails
 * @param {Logger} [logger] - Optional logger instance (defaults to console)
 * @returns {number} Numeric value or default
 */
function numberConverter(value: unknown, defaultValue = NaN): number {
  if (value === undefined) {
    return defaultValue;
  }
  const num = Number(value);

  if (isNaN(num)) {
    return defaultValue;
  }

  return num;
}

export { numberConverter };
