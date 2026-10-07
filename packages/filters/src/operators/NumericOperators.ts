
import { Predicates } from '#runtime';

import type { FilterValueEntity } from '../FilterValueEntity.js';
/**
 * @module NumericOperators
 * @description Numeric operation implementations for FilterEngine
 */
import type { FilterConditionInterface } from '../interfaces.js';

import { IsInRange } from '../comparators/composite/isInRange.js';
import { IsOutsideRange } from '../comparators/composite/isOutsideRange.js';
import { DateRangeProcessor } from '../converters/DateRangeProcessor.js';
import { InclusiveFlagResolver } from '../converters/InclusiveFlagResolver.js';
import { NumericRangeProcessor } from '../converters/NumericRangeProcessor.js';
import { FilterOperatorError } from '../errors/FilterOperatorError.js';

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
  static handleBetween(value: unknown, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: unknown }) {
    const inclusive = InclusiveFlagResolver.getInclusiveFlag(options?.condition);
    const firstFilterValue = Array.isArray(filterValue) ? filterValue[0] : undefined;

    // Handle date values first
    if (Predicates.isDateLike(value) || Predicates.isDateLike(firstFilterValue)) {
      const result = NumericOperators.handleDateBetween(value, filterValue, inclusive);

      return result;
    }

    // Handle numeric values
    const result = NumericOperators.handleNumericBetween(value, filterValue, options?.condition, inclusive);

    return result;
  }

  private static handleDateBetween(value: unknown, filterValue: FilterValueEntity.Type, inclusive: boolean): boolean {
    const dateInfo = DateRangeProcessor.processDateRange(value, filterValue);

    if (dateInfo === null) {
      return false;
    }

    const {
      dateTime,
      maximum,
      minimum
    } = dateInfo;
    const result = NumericOperators.isWithinRange(dateTime, minimum, maximum, inclusive);

    return result;
  }

  private static handleNumericBetween(
    value: unknown,
    filterValue: FilterValueEntity.Type,
    condition: FilterConditionInterface | undefined,
    inclusive: boolean
  ): boolean {
    const {
      maximum,
      minimum,
      numberValue
    } = NumericRangeProcessor.processNumericRange(value, filterValue, condition);
    const result = NumericOperators.isWithinRange(numberValue, minimum, maximum, inclusive);

    return result;
  }

  private static isWithinRange(value: number, minimum: number, maximum: number, inclusive: boolean): boolean {
    const result = inclusive
      ? IsInRange.isInRange(value, [
        minimum,
        maximum
      ])
      : (value > minimum && value < maximum);

    return result;
  }


  /**
   * Checks if two numbers are equal (strict number-only comparison)
   * @param {*} value - Value to check
   * @param {*} filterValue - Number to compare against
   * @returns {boolean} True if numbers are exactly equal
   * @throws {Error} If either value is not a number
   */
  static handleEquals(value: unknown, filterValue: FilterValueEntity.Type) {
    if (typeof value !== 'number') {
      throw new FilterOperatorError(`NUMBER.EQUALS requires value to be a number, got ${typeof value}`, { 'operator': 'NUMBER.EQUALS' });
    }
    if (typeof filterValue !== 'number') {
      throw new FilterOperatorError(`NUMBER.EQUALS requires filter value to be a number, got ${typeof filterValue}`, { 'operator': 'NUMBER.EQUALS' });
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
  static handleGreater(value: unknown, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: unknown }) {
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
  static handleGreaterEqual(value: unknown, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: unknown }) {
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
  static handleIdentical(value: unknown, filterValue: FilterValueEntity.Type) {
    if (typeof value !== 'number') {
      throw new FilterOperatorError(`NUMBER.IDENTICAL requires value to be a number, got ${typeof value}`, { 'operator': 'NUMBER.IDENTICAL' });
    }
    if (typeof filterValue !== 'number') {
      throw new FilterOperatorError(`NUMBER.IDENTICAL requires filter value to be a number, got ${typeof filterValue}`, { 'operator': 'NUMBER.IDENTICAL' });
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
  static handleLess(value: unknown, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: unknown }) {
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
  static handleLessEqual(value: unknown, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: unknown }) {
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
  static handleModulo(value: unknown, filterValue: FilterValueEntity.Type, _options?: { 'condition'?: FilterConditionInterface; 'data'?: unknown }) {
    // Only work with numbers - no type coercion
    if (typeof value !== 'number') {
      return false;
    }

    const parsed = NumericOperators.parseModuloOperands(value, filterValue);

    if (parsed === null) {
      return false;
    }

    const { divisor, remainder } = parsed;
    // Optimized modulo for power-of-2 divisors
    const result = NumericOperators.isPowerOfTwo(divisor)
      ? (value & (divisor - 1)) === remainder
      : value % divisor === remainder;

    return result;
  }

  private static parseModuloOperands(value: number, filterValue: FilterValueEntity.Type): { 'divisor': number, 'remainder': number } | null {
    // Only accept object format { divisor, remainder }
    if (!Predicates.isPlainObject(filterValue)) {
      return null;
    }

    const {
      divisor, remainder
    } = filterValue;

    // Both must be numbers
    if (typeof divisor !== 'number' || typeof remainder !== 'number') {
      return null;
    }

    if (isNaN(value) || isNaN(divisor) || isNaN(remainder) || divisor === 0) {
      return null;
    }

    return { 'divisor': divisor, 'remainder': remainder };
  }

  private static isPowerOfTwo(divisor: number): boolean {
    const result = divisor > 0 && (divisor & (divisor - 1)) === 0;

    return result;
  }

  /**
   * Checks if two numbers are not equal (strict number-only comparison)
   * @param {*} value - Value to check
   * @param {*} filterValue - Number to compare against
   * @returns {boolean} True if numbers are not equal
   * @throws {Error} If either value is not a number
   */
  static handleNotEquals(value: unknown, filterValue: FilterValueEntity.Type) {
    if (typeof value !== 'number') {
      throw new FilterOperatorError(`NUMBER.NOT_EQUALS requires value to be a number, got ${typeof value}`, { 'operator': 'NUMBER.NOT_EQUALS' });
    }
    if (typeof filterValue !== 'number') {
      throw new FilterOperatorError(`NUMBER.NOT_EQUALS requires filter value to be a number, got ${typeof filterValue}`, { 'operator': 'NUMBER.NOT_EQUALS' });
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
  static handleNotIdentical(value: unknown, filterValue: FilterValueEntity.Type) {
    if (typeof value !== 'number') {
      throw new FilterOperatorError(`NUMBER.NOT_IDENTICAL requires value to be a number, got ${typeof value}`, { 'operator': 'NUMBER.NOT_IDENTICAL' });
    }
    if (typeof filterValue !== 'number') {
      throw new FilterOperatorError(`NUMBER.NOT_IDENTICAL requires filter value to be a number, got ${typeof filterValue}`, { 'operator': 'NUMBER.NOT_IDENTICAL' });
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
  static handleOutside(value: unknown, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: unknown }) {
    const inclusive = InclusiveFlagResolver.getInclusiveFlag(options?.condition);
    const firstFilterValue = Array.isArray(filterValue) ? filterValue[0] : undefined;

    // Handle date values first
    if (Predicates.isDateLike(value) || Predicates.isDateLike(firstFilterValue)) {
      const result = NumericOperators.handleDateOutside(value, filterValue, inclusive);

      return result;
    }

    // Handle numeric values
    const result = NumericOperators.handleNumericOutside(value, filterValue, options?.condition, inclusive);

    return result;
  }

  private static handleDateOutside(value: unknown, filterValue: FilterValueEntity.Type, inclusive: boolean): boolean {
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
    const result = NumericOperators.isOutsideRange(dateTime, minimum, maximum, inclusive);

    return result;
  }

  private static handleNumericOutside(
    value: unknown,
    filterValue: FilterValueEntity.Type,
    condition: FilterConditionInterface | undefined,
    inclusive: boolean
  ): boolean {
    const {
      maximum,
      minimum,
      numberValue
    } = NumericRangeProcessor.processNumericRange(value, filterValue, condition);
    const result = NumericOperators.isOutsideRange(numberValue, minimum, maximum, inclusive);

    return result;
  }

  private static isOutsideRange(value: number, minimum: number, maximum: number, inclusive: boolean): boolean {
    const result = inclusive
      ? IsOutsideRange.isOutsideRange(value, [
        minimum,
        maximum
      ])
      : (value < minimum || value > maximum);

    return result;
  }
}
