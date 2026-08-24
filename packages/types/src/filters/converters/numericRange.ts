/**
 * @module NumericRangeProcessor
 * @description Process numeric range values for comparison
 */

import { NumberConverter } from './numberConverter.js';

interface NumericCondition {
  'maxValue'?: number;
  'minValue'?: number;
}

/**
 * Process numeric range values for comparison
 */
export class NumericRangeProcessor {
  /**
   * Process numeric range values for comparison
   * @param {*} value - Value to check
   * @param {Array} filterValue - Range values [start, end]
   * @param {Object} condition - condition with potential pre-computed values
   * @returns {Object} Processed numeric info {numValue, min, max}
   */
  static processNumericRange(value: unknown, filterValue: unknown, condition: NumericCondition = {}): { 'max': number
    'min': number;
    'numValue': number; } {
    const numValue = NumberConverter.numberConverter(value, NaN);

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
    const firstValue = NumberConverter.numberConverter(rangeStart, NaN);
    const secondValue = NumberConverter.numberConverter(rangeEnd, NaN);

    const result = {
      'max': firstValue > secondValue ? firstValue : secondValue,
      'min': firstValue < secondValue ? firstValue : secondValue,
      'numValue': numValue
    };


    return result;
  }
}
