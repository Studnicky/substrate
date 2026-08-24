/**
 * @module processNumericRange
 * @description Process numeric range values for comparison
 */

import { numberConverter } from '../converters/numberConverter.js';

interface NumericCondition {
  'maxValue'?: number;
  'minValue'?: number;
}

/**
 * Process numeric range values for comparison
 * @param {*} value - Value to check
 * @param {Array} filterValue - Range values [start, end]
 * @param {Object} condition - condition with potential pre-computed values
 * @param {Logger} [logger] - Optional logger instance (defaults to console)
 * @returns {Object} Processed numeric info {numValue, min, max}
 */
function processNumericRange(value: unknown, filterValue: unknown, condition: NumericCondition = {}): { 'max': number
  'min': number;
  'numValue': number; } {
  const numValue = numberConverter(value, NaN);

  if (condition.minValue !== undefined && condition.maxValue !== undefined) {
    const result = {
      'max': condition.maxValue,
      'min': condition.minValue,
      'numValue': numValue
    };

    return result;
  }

  const [
    rangeStart,
    rangeEnd
  ] = Array.isArray(filterValue) ? filterValue : [
    undefined,
    undefined
  ];
  const firstValue = numberConverter(rangeStart, NaN);
  const secondValue = numberConverter(rangeEnd, NaN);

  const result = {
    'max': firstValue > secondValue ? firstValue : secondValue,
    'min': firstValue < secondValue ? firstValue : secondValue,
    'numValue': numValue
  };


  return result;
}

export { processNumericRange };
