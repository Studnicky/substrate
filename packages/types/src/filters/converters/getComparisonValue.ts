/**
 * @module getComparisonValue
 * @description Get comparison value from condition or filter value
 */

import { numberConverter } from '../converters/numberConverter.js';

/**
 * Get comparison value from condition or filter value
 * @param {*} filterValue - Raw filter value
 * @param {Object} condition - condition with potential pre-computed value
 * @param {Logger} [logger] - Optional logger instance (defaults to console)
 * @returns {number} Numeric comparison value
 */
function getComparisonValue(filterValue: unknown, condition: { 'numericValue'?: number }): number {
  if (condition.numericValue !== undefined) {
    return condition.numericValue;
  }

  const result = numberConverter(filterValue, NaN);

  return result;
}

export { getComparisonValue };
