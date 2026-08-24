/**
 * @module NumericOperators
 * @description Numeric operation implementations for FilterEngine
 */
import type { FilterCondition, FilterValue } from '../types.js';

import { Guard } from '../../guards/Guard.js';
import { isDateLike } from '../comparators/atomic/isDateLike.js';
import { isInRange } from '../comparators/composite/isInRange.js';
import { isOutsideRange } from '../comparators/composite/isOutsideRange.js';
import { processDateRange } from '../converters/dateRange.js';
import { getInclusiveFlag } from '../converters/inclusiveFlag.js';
import { processNumericRange } from '../converters/numericRange.js';

/**
 * Numeric operation implementations
 */
export class NumericOperators {
  // Set of operator registry keys ("NUMBER.GREATER" etc) that benefit from
  // numeric compilation optimization - matched against condition.operator,
  // which the engine passes as a dot-notation string, not the operator function.
  static numericOperators = new Set([
    'NUMBER.GREATER',
    'NUMBER.GREATER_EQUAL',
    'NUMBER.LESS',
    'NUMBER.LESS_EQUAL'
  ]);
  /**
   * Checks if a value is between two values (inclusive by default)
   * @param {*} value - Value to check
   * @param {Array|*} filterValue - Range values or fallback
   * @param {Object} condition - Compiled condition with minValue/maxValue
   * @param {*} data - FilterEngine instance
   * @returns {boolean} True if value is within range
   */
  static handleBetween(value: FilterValue, filterValue: FilterValue, condition?: FilterCondition, _data?: Record<string, unknown>) {
    const inclusive = getInclusiveFlag(condition);
    const firstFilterValue = Array.isArray(filterValue) ? filterValue[0] : undefined;

    // Handle date values first
    if (isDateLike(value) || isDateLike(firstFilterValue)) {
      const dateInfo = processDateRange(value, filterValue);

      if (!dateInfo) {
        return false;
      }

      const {
        dateTime,
        max,
        min
      } = dateInfo;
      const result = inclusive
        ? isInRange(dateTime, [
          min,
          max
        ])
        : (dateTime > min && dateTime < max);

      return result;
    }

    // Handle numeric values
    const {
      max,
      min,
      numValue
    } = processNumericRange(value, filterValue, condition);

    const result = inclusive
      ? isInRange(numValue, [
        min,
        max
      ])
      : (numValue > min && numValue < max);

    return result;
  }


  /**
   * Checks if two numbers are equal (strict number-only comparison)
   * @param {*} value - Value to check
   * @param {*} filterValue - Number to compare against
   * @returns {boolean} True if numbers are exactly equal
   * @throws {Error} If either value is not a number
   */
  static handleEquals(value: FilterValue, filterValue: FilterValue) {
    if (typeof value !== 'number') {
      throw new Error(`NUMBER.EQUALS requires value to be a number, got ${typeof value}`);
    }
    if (typeof filterValue !== 'number') {
      throw new Error(`NUMBER.EQUALS requires filter value to be a number, got ${typeof filterValue}`);
    }

    // Handle NaN - NaN is not equal to anything, including itself
    if (isNaN(value) || isNaN(filterValue)) {
      return false;
    }

    return value === filterValue;
  }

  /**
   * Checks if a numeric value is greater than another
   * @param {*} value - Value to check
   * @param {*} filterValue - Value to compare against
   * @param {Object} condition - Compiled condition with numeric value
   * @returns {boolean} True if value is greater
   */
  static handleGreater(value: FilterValue, filterValue: FilterValue, condition?: FilterCondition) {
    const comparisonValue = condition?.numericValue !== undefined
      ? condition?.numericValue
      : filterValue;

    // Only work with actual numbers - no type coercion
    if (typeof value !== 'number' || typeof comparisonValue !== 'number') {
      // Handle BigInt as a special case
      if (typeof value === 'bigint' && typeof comparisonValue === 'bigint') {
        return value > comparisonValue;
      }

      return false;
    }

    // Handle NaN - NaN comparisons always return false
    if (isNaN(value) || isNaN(comparisonValue)) {
      return false;
    }

    return value > comparisonValue;
  }

  /**
   * Checks if a numeric value is greater than or equal to another
   * @param {*} value - Value to check
   * @param {*} filterValue - Value to compare against
   * @param {Object} condition - Compiled condition with numeric value
   * @returns {boolean} True if value is greater or equal
   */
  static handleGreaterEqual(value: FilterValue, filterValue: FilterValue, condition?: FilterCondition) {
    const comparisonValue = condition?.numericValue !== undefined
      ? condition?.numericValue
      : filterValue;

    // Only work with actual numbers - no type coercion
    if (typeof value !== 'number' || typeof comparisonValue !== 'number') {
      // Handle BigInt as a special case
      if (typeof value === 'bigint' && typeof comparisonValue === 'bigint') {
        return value >= comparisonValue;
      }

      return false;
    }

    // Handle NaN - NaN comparisons always return false
    if (isNaN(value) || isNaN(comparisonValue)) {
      return false;
    }

    return value >= comparisonValue;
  }

  /**
   * Checks if two numbers are identical (same as equals for numbers)
   * @param {*} value - Value to check
   * @param {*} filterValue - Number to compare against
   * @returns {boolean} True if numbers are identical
   * @throws {Error} If either value is not a number
   */
  static handleIdentical(value: FilterValue, filterValue: FilterValue) {
    if (typeof value !== 'number') {
      throw new Error(`NUMBER.IDENTICAL requires value to be a number, got ${typeof value}`);
    }
    if (typeof filterValue !== 'number') {
      throw new Error(`NUMBER.IDENTICAL requires filter value to be a number, got ${typeof filterValue}`);
    }

    // For numbers, identical means bitwise identical (including NaN handling)
    return Object.is(value, filterValue);
  }

  /**
   * Checks if a numeric value is less than another
   * @param {*} value - Value to check
   * @param {*} filterValue - Value to compare against
   * @param {Object} condition - Compiled condition with numeric value
   * @returns {boolean} True if value is less
   */
  static handleLess(value: FilterValue, filterValue: FilterValue, condition?: FilterCondition) {
    const comparisonValue = condition?.numericValue !== undefined
      ? condition?.numericValue
      : filterValue;

    // Only work with actual numbers - no type coercion
    if (typeof value !== 'number' || typeof comparisonValue !== 'number') {
      // Handle BigInt as a special case
      if (typeof value === 'bigint' && typeof comparisonValue === 'bigint') {
        return value < comparisonValue;
      }

      return false;
    }

    // Handle NaN - NaN comparisons always return false
    if (isNaN(value) || isNaN(comparisonValue)) {
      return false;
    }

    return value < comparisonValue;
  }

  /**
   * Checks if a numeric value is less than or equal to another
   * @param {*} value - Value to check
   * @param {*} filterValue - Value to compare against
   * @param {Object} condition - Compiled condition with numeric value
   * @returns {boolean} True if value is less or equal
   */
  static handleLessEqual(value: FilterValue, filterValue: FilterValue, condition?: FilterCondition) {
    const comparisonValue = condition?.numericValue !== undefined
      ? condition?.numericValue
      : filterValue;

    // Only work with actual numbers - no type coercion
    if (typeof value !== 'number' || typeof comparisonValue !== 'number') {
      // Handle BigInt as a special case
      if (typeof value === 'bigint' && typeof comparisonValue === 'bigint') {
        return value <= comparisonValue;
      }

      return false;
    }

    // Handle NaN - NaN comparisons always return false
    if (isNaN(value) || isNaN(comparisonValue)) {
      return false;
    }

    return value <= comparisonValue;
  }

  /**
   * Checks if a value matches a modulo remainder
   * @param {*} value - Value to check
   * @param {Object} filterValue - { divisor, remainder } object
   * @param {Object} condition - Compiled condition (unused)
   * @returns {boolean} True if value % divisor equals remainder
   */
  static handleModulo(value: FilterValue, filterValue: FilterValue, _condition?: FilterCondition) {
    // Only work with numbers - no type coercion
    if (typeof value !== 'number') {
      return false;
    }

    // Only accept object format { divisor, remainder }
    if (!Guard.isPlainObject(filterValue)) {
      return false;
    }

    const {
      divisor, remainder
    } = filterValue;

    // Both must be numbers
    if (typeof divisor !== 'number' || typeof remainder !== 'number') {
      return false;
    }

    if (isNaN(value) || isNaN(divisor) || isNaN(remainder) || divisor === 0) {
      return false;
    }

    // Optimized modulo for power-of-2 divisors
    if (divisor > 0 && (divisor & (divisor - 1)) === 0) {
      return (value & (divisor - 1)) === remainder;
    }

    return value % divisor === remainder;
  }

  /**
   * Checks if two numbers are not equal (strict number-only comparison)
   * @param {*} value - Value to check
   * @param {*} filterValue - Number to compare against
   * @returns {boolean} True if numbers are not equal
   * @throws {Error} If either value is not a number
   */
  static handleNotEquals(value: FilterValue, filterValue: FilterValue) {
    if (typeof value !== 'number') {
      throw new Error(`NUMBER.NOT_EQUALS requires value to be a number, got ${typeof value}`);
    }
    if (typeof filterValue !== 'number') {
      throw new Error(`NUMBER.NOT_EQUALS requires filter value to be a number, got ${typeof filterValue}`);
    }

    // Handle NaN - NaN is not equal to anything, so it's always "not equal"
    if (isNaN(value) || isNaN(filterValue)) {
      return true;
    }

    return value !== filterValue;
  }

  /**
   * Checks if two numbers are not identical
   * @param {*} value - Value to check
   * @param {*} filterValue - Number to compare against
   * @returns {boolean} True if numbers are not identical
   * @throws {Error} If either value is not a number
   */
  static handleNotIdentical(value: FilterValue, filterValue: FilterValue) {
    if (typeof value !== 'number') {
      throw new Error(`NUMBER.NOT_IDENTICAL requires value to be a number, got ${typeof value}`);
    }
    if (typeof filterValue !== 'number') {
      throw new Error(`NUMBER.NOT_IDENTICAL requires filter value to be a number, got ${typeof filterValue}`);
    }

    return !Object.is(value, filterValue);
  }

  /**
   * Checks if a value is outside a range
   * @param {*} value - Value to check
   * @param {Array} filterValue - Range values [min, max]
   * @param {Object} condition - Compiled condition with inclusive option
   * @param {*} data - FilterEngine instance
   * @returns {boolean} True if value is outside range
   */
  static handleOutside(value: FilterValue, filterValue: FilterValue, condition?: FilterCondition, _data?: Record<string, unknown>) {
    const inclusive = getInclusiveFlag(condition);
    const firstFilterValue = Array.isArray(filterValue) ? filterValue[0] : undefined;

    // Handle date values first
    if (isDateLike(value) || isDateLike(firstFilterValue)) {
      const dateInfo = processDateRange(value, filterValue);

      if (!dateInfo) {
        // Invalid dates are considered "outside"
        return true;
      }

      const {
        dateTime,
        max,
        min
      } = dateInfo;
      const result = inclusive
        ? isOutsideRange(dateTime, [
          min,
          max
        ])
        : (dateTime < min || dateTime > max);

      return result;
    }

    // Handle numeric values
    const {
      max,
      min,
      numValue
    } = processNumericRange(value, filterValue, condition);

    const result = inclusive
      ? isOutsideRange(numValue, [
        min,
        max
      ])
      : (numValue < min || numValue > max);

    return result;
  }
}
