/**
 * @module NumericRangeProcessor
 * @description Process numeric range values for comparison
 */

import type { FilterConditionInterface } from '../interfaces.js';

import { NumberConverter } from './numberConverter.js';

/**
 * Process numeric range values for comparison
 */
export class NumericRangeProcessor {
  /**
   * Process numeric range values for comparison
   * @param {*} value - Value to check
   * @param {Array} filterValue - Range values [start, end]
   * @param {Object} condition - condition with potential pre-computed values
   * @returns {Object} Processed numeric info {numberValue, minimum, maximum}
   */
  static processNumericRange(value: unknown, filterValue: unknown, condition: FilterConditionInterface = {}): { 'maximum': number
    'minimum': number;
    'numberValue': number; } {
    const numberValue = NumberConverter.numberConverter(value, NaN);

    if (condition.minimumValue !== undefined && condition.maximumValue !== undefined) {
      const result = {
        'maximum': condition.maximumValue,
        'minimum': condition.minimumValue,
        'numberValue': numberValue
      };

      return result;
    }

    const [
      rangeStart,
      rangeEnd
    ]: unknown[] = Array.isArray(filterValue) ? filterValue as unknown[] : [
      undefined,
      undefined
    ];
    const firstValue = NumberConverter.numberConverter(rangeStart, NaN);
    const secondValue = NumberConverter.numberConverter(rangeEnd, NaN);

    const result = {
      'maximum': firstValue > secondValue ? firstValue : secondValue,
      'minimum': firstValue < secondValue ? firstValue : secondValue,
      'numberValue': numberValue
    };


    return result;
  }
}
