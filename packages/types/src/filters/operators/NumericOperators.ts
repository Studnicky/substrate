import type { FilterValueEntity } from '../FilterValueEntity.js';
/**
 * @module NumericOperators
 * @description Numeric operation implementations for FilterEngine
 */
import type { FilterConditionInterface } from '../interfaces.js';

import { Guard } from '../../guards/Guard.js';
import { IsDateLike } from '../comparators/atomic/isDateLike.js';
import { IsInRange } from '../comparators/composite/isInRange.js';
import { IsOutsideRange } from '../comparators/composite/isOutsideRange.js';
import { DateRangeProcessor } from '../converters/DateRangeProcessor.js';
import { InclusiveFlagResolver } from '../converters/InclusiveFlagResolver.js';
import { NumericRangeProcessor } from '../converters/NumericRangeProcessor.js';

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
  static handleBetween(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }) {
    const inclusive = InclusiveFlagResolver.getInclusiveFlag(options?.condition);
    const firstFilterValue = Array.isArray(filterValue) ? filterValue[0] : undefined;

    // Handle date values first
    if (IsDateLike.isDateLike(value) || IsDateLike.isDateLike(firstFilterValue)) {
      const dateInfo = DateRangeProcessor.processDateRange(value, filterValue);

      if (dateInfo === null) {
        return false;
      }

      const {
        dateTime,
        maximum,
        minimum
      } = dateInfo;
      const result = inclusive
        ? IsInRange.isInRange(dateTime, [
          minimum,
          maximum
        ])
        : (dateTime > minimum && dateTime < maximum);

      return result;
    }

    // Handle numeric values
    const {
      maximum,
      minimum,
      numberValue
    } = NumericRangeProcessor.processNumericRange(value, filterValue, options?.condition);

    const result = inclusive
      ? IsInRange.isInRange(numberValue, [
        minimum,
        maximum
      ])
      : (numberValue > minimum && numberValue < maximum);

    return result;
  }


  /**
   * Checks if two numbers are equal (strict number-only comparison)
   * @param {*} value - Value to check
   * @param {*} filterValue - Number to compare against
   * @returns {boolean} True if numbers are exactly equal
   * @throws {Error} If either value is not a number
   */
  static handleEquals(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type) {
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

    const result = value === filterValue;

    return result;
  }

  /**
   * Checks if a numeric value is greater than another
   * @param {*} value - Value to check
   * @param {*} filterValue - Value to compare against
   * @param {Object} condition - Compiled condition with numeric value
   * @returns {boolean} True if value is greater
   */
  static handleGreater(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }) {
    const comparisonValue = options?.condition?.numericValue ?? filterValue;

    // Only work with actual numbers - no type coercion
    if (typeof value !== 'number' || typeof comparisonValue !== 'number') {
      // Handle BigInt as a special case
      if (typeof value === 'bigint' && typeof comparisonValue === 'bigint') {
        const result = value > comparisonValue;

        return result;
      }

      return false;
    }

    // Handle NaN - NaN comparisons always return false
    if (isNaN(value) || isNaN(comparisonValue)) {
      return false;
    }

    const result = value > comparisonValue;

    return result;
  }

  /**
   * Checks if a numeric value is greater than or equal to another
   * @param {*} value - Value to check
   * @param {*} filterValue - Value to compare against
   * @param {Object} condition - Compiled condition with numeric value
   * @returns {boolean} True if value is greater or equal
   */
  static handleGreaterEqual(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }) {
    const comparisonValue = options?.condition?.numericValue ?? filterValue;

    // Only work with actual numbers - no type coercion
    if (typeof value !== 'number' || typeof comparisonValue !== 'number') {
      // Handle BigInt as a special case
      if (typeof value === 'bigint' && typeof comparisonValue === 'bigint') {
        const result = value >= comparisonValue;

        return result;
      }

      return false;
    }

    // Handle NaN - NaN comparisons always return false
    if (isNaN(value) || isNaN(comparisonValue)) {
      return false;
    }

    const result = value >= comparisonValue;

    return result;
  }

  /**
   * Checks if two numbers are identical (same as equals for numbers)
   * @param {*} value - Value to check
   * @param {*} filterValue - Number to compare against
   * @returns {boolean} True if numbers are identical
   * @throws {Error} If either value is not a number
   */
  static handleIdentical(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type) {
    if (typeof value !== 'number') {
      throw new Error(`NUMBER.IDENTICAL requires value to be a number, got ${typeof value}`);
    }
    if (typeof filterValue !== 'number') {
      throw new Error(`NUMBER.IDENTICAL requires filter value to be a number, got ${typeof filterValue}`);
    }

    // For numbers, identical means bitwise identical (including NaN handling)
    const result = Object.is(value, filterValue);

    return result;
  }

  /**
   * Checks if a numeric value is less than another
   * @param {*} value - Value to check
   * @param {*} filterValue - Value to compare against
   * @param {Object} condition - Compiled condition with numeric value
   * @returns {boolean} True if value is less
   */
  static handleLess(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }) {
    const comparisonValue = options?.condition?.numericValue ?? filterValue;

    // Only work with actual numbers - no type coercion
    if (typeof value !== 'number' || typeof comparisonValue !== 'number') {
      // Handle BigInt as a special case
      if (typeof value === 'bigint' && typeof comparisonValue === 'bigint') {
        const result = value < comparisonValue;

        return result;
      }

      return false;
    }

    // Handle NaN - NaN comparisons always return false
    if (isNaN(value) || isNaN(comparisonValue)) {
      return false;
    }

    const result = value < comparisonValue;

    return result;
  }

  /**
   * Checks if a numeric value is less than or equal to another
   * @param {*} value - Value to check
   * @param {*} filterValue - Value to compare against
   * @param {Object} condition - Compiled condition with numeric value
   * @returns {boolean} True if value is less or equal
   */
  static handleLessEqual(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }) {
    const comparisonValue = options?.condition?.numericValue ?? filterValue;

    // Only work with actual numbers - no type coercion
    if (typeof value !== 'number' || typeof comparisonValue !== 'number') {
      // Handle BigInt as a special case
      if (typeof value === 'bigint' && typeof comparisonValue === 'bigint') {
        const result = value <= comparisonValue;

        return result;
      }

      return false;
    }

    // Handle NaN - NaN comparisons always return false
    if (isNaN(value) || isNaN(comparisonValue)) {
      return false;
    }

    const result = value <= comparisonValue;

    return result;
  }

  /**
   * Checks if a value matches a modulo remainder
   * @param {*} value - Value to check
   * @param {Object} filterValue - { divisor, remainder } object
   * @param {Object} condition - Compiled condition (unused)
   * @returns {boolean} True if value % divisor equals remainder
   */
  static handleModulo(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type, _options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }) {
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
      const result = (value & (divisor - 1)) === remainder;

      return result;
    }

    const result = value % divisor === remainder;

    return result;
  }

  /**
   * Checks if two numbers are not equal (strict number-only comparison)
   * @param {*} value - Value to check
   * @param {*} filterValue - Number to compare against
   * @returns {boolean} True if numbers are not equal
   * @throws {Error} If either value is not a number
   */
  static handleNotEquals(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type) {
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

    const result = value !== filterValue;

    return result;
  }

  /**
   * Checks if two numbers are not identical
   * @param {*} value - Value to check
   * @param {*} filterValue - Number to compare against
   * @returns {boolean} True if numbers are not identical
   * @throws {Error} If either value is not a number
   */
  static handleNotIdentical(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type) {
    if (typeof value !== 'number') {
      throw new Error(`NUMBER.NOT_IDENTICAL requires value to be a number, got ${typeof value}`);
    }
    if (typeof filterValue !== 'number') {
      throw new Error(`NUMBER.NOT_IDENTICAL requires filter value to be a number, got ${typeof filterValue}`);
    }

    const result = !Object.is(value, filterValue);

    return result;
  }

  /**
   * Checks if a value is outside a range
   * @param {*} value - Value to check
   * @param {Array} filterValue - Range values [min, max]
   * @param {Object} condition - Compiled condition with inclusive option
   * @param {*} data - FilterEngine instance
   * @returns {boolean} True if value is outside range
   */
  static handleOutside(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }) {
    const inclusive = InclusiveFlagResolver.getInclusiveFlag(options?.condition);
    const firstFilterValue = Array.isArray(filterValue) ? filterValue[0] : undefined;

    // Handle date values first
    if (IsDateLike.isDateLike(value) || IsDateLike.isDateLike(firstFilterValue)) {
      const dateInfo = DateRangeProcessor.processDateRange(value, filterValue);

      if (dateInfo === null) {
        // Invalid dates are considered "outside"
        return true;
      }

      const {
        dateTime,
        maximum,
        minimum
      } = dateInfo;
      const result = inclusive
        ? IsOutsideRange.isOutsideRange(dateTime, [
          minimum,
          maximum
        ])
        : (dateTime < minimum || dateTime > maximum);

      return result;
    }

    // Handle numeric values
    const {
      maximum,
      minimum,
      numberValue
    } = NumericRangeProcessor.processNumericRange(value, filterValue, options?.condition);

    const result = inclusive
      ? IsOutsideRange.isOutsideRange(numberValue, [
        minimum,
        maximum
      ])
      : (numberValue < minimum || numberValue > maximum);

    return result;
  }
}
