/**
 * @module ComparisonValueResolver
 * @description Get comparison value from condition or filter value
 */

import { NumberConverter } from './numberConverter.js';

/**
 * Get comparison value from condition or filter value
 */
export class ComparisonValueResolver {
  /**
   * Get comparison value from condition or filter value
   * @param {*} filterValue - Raw filter value
   * @param {Object} condition - condition with potential pre-computed value
   * @returns {number} Numeric comparison value
   */
  static getComparisonValue(filterValue: unknown, condition: { 'numericValue'?: number }): number {
    if (condition.numericValue !== undefined) {
      return condition.numericValue;
    }

    const result = NumberConverter.numberConverter(filterValue, NaN);

    return result;
  }
}
