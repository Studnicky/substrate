import { Predicates } from '@studnicky/types/browser';

import type { FilterValueEntity } from '../../FilterValueEntity.js';
import type { FilterConditionInterface } from '../../interfaces.js';

import { FilterOperatorError } from '../../errors/FilterOperatorError.js';

/**
 * Number-typed operator implementations
 */
export class NumberOperators {
  static numberGreater(value: unknown, filterValue: FilterValueEntity.Type): boolean {
    if (typeof value !== 'number') {
      throw new FilterOperatorError(`NUMBER.GREATER requires value to be a number, got ${typeof value}`, {});
    }
    if (typeof filterValue !== 'number') {
      throw new FilterOperatorError(`NUMBER.GREATER requires filter value to be a number, got ${typeof filterValue}`, {});
    }

    const result = value > filterValue;

    return result;
  }

  static numberGreaterEqual(value: unknown, filterValue: FilterValueEntity.Type): boolean {
    if (typeof value !== 'number') {
      throw new FilterOperatorError(`NUMBER.GREATER_EQUAL requires value to be a number, got ${typeof value}`, {});
    }
    if (typeof filterValue !== 'number') {
      throw new FilterOperatorError(`NUMBER.GREATER_EQUAL requires filter value to be a number, got ${typeof filterValue}`, {});
    }

    const result = value >= filterValue;

    return result;
  }

  static numberLess(value: unknown, filterValue: FilterValueEntity.Type): boolean {
    if (typeof value !== 'number') {
      throw new FilterOperatorError(`NUMBER.LESS requires value to be a number, got ${typeof value}`, {});
    }
    if (typeof filterValue !== 'number') {
      throw new FilterOperatorError(`NUMBER.LESS requires filter value to be a number, got ${typeof filterValue}`, {});
    }

    const result = value < filterValue;

    return result;
  }

  static numberLessEqual(value: unknown, filterValue: FilterValueEntity.Type): boolean {
    if (typeof value !== 'number') {
      throw new FilterOperatorError(`NUMBER.LESS_EQUAL requires value to be a number, got ${typeof value}`, {});
    }
    if (typeof filterValue !== 'number') {
      throw new FilterOperatorError(`NUMBER.LESS_EQUAL requires filter value to be a number, got ${typeof filterValue}`, {});
    }

    const result = value <= filterValue;

    return result;
  }

  static numberBetween(value: unknown, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: unknown }): boolean {
    // NUMBER.BETWEEN should only handle numeric values
    // Time/date comparisons should use DATE.BETWEEN or TimeOperatorsPlugin
    if (typeof value !== 'number') {
      return false;
    }

    const range = NumberOperators.parseMinimumMaximumRange(
      filterValue,
      'NUMBER.BETWEEN requires filterValue to be an object with min and max properties: { min: number, max: number }'
    );

    if (range === null) {
      return false;
    }

    // Default to inclusive unless explicitly set to false
    const inclusive = options?.condition?.inclusive !== false;

    const result = inclusive
      ? (value >= range.minimum && value <= range.maximum)
      : (value > range.minimum && value < range.maximum);

    return result;
  }

  static numberOutside(value: unknown, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: unknown }): boolean {
    // NUMBER.OUTSIDE should only handle numeric values
    // Time/date comparisons should use DATE.OUTSIDE or TimeOperatorsPlugin
    if (typeof value !== 'number') {
      return false;
    }

    const range = NumberOperators.parseMinimumMaximumRange(
      filterValue,
      'NUMBER.OUTSIDE requires filterValue to be an object with min and max properties: { min: number, max: number }'
    );

    if (range === null) {
      return false;
    }

    // Default to inclusive unless explicitly set to false
    const inclusive = options?.condition?.inclusive !== false;

    const result = inclusive
      ? (value < range.minimum || value > range.maximum)
      : (value <= range.minimum || value >= range.maximum);

    return result;
  }

  /** Enforces object format `{ min, max }`, throwing `errorMessage` on shape mismatch; `null` on non-numeric min/max. */
  private static parseMinimumMaximumRange(filterValue: FilterValueEntity.Type, errorMessage: string): { 'maximum': number, 'minimum': number } | null {
    if (typeof filterValue !== 'object' || filterValue === null || Array.isArray(filterValue) || !Predicates.isRecord(filterValue)) {
      throw new FilterOperatorError(errorMessage, {});
    }

    let minimum = Number(Reflect.get(filterValue, 'min'));
    let maximum = Number(Reflect.get(filterValue, 'max'));

    // Validate numbers
    if (isNaN(minimum) || isNaN(maximum)) {
      return null;
    }

    // Handle Infinity
    if (!isFinite(minimum)) {
      minimum = -Infinity;
    }
    if (!isFinite(maximum)) {
      maximum = Infinity;
    }

    return { 'maximum': maximum, 'minimum': minimum };
  }

  static numberModulo(value: unknown, filterValue: FilterValueEntity.Type): boolean {
    // Only work with numbers - no type coercion
    if (typeof value !== 'number') {
      throw new FilterOperatorError(`NUMBER.MODULO requires value to be a number, got ${typeof value}`, {});
    }

    const record = NumberOperators.parseModuloRecord(filterValue);
    const parsed = NumberOperators.parseModuloOperands(value, record);

    if (parsed === null) {
      return false;
    }

    const { divisor, remainder } = parsed;
    // Optimized modulo for power-of-2 divisors
    const result = NumberOperators.isPowerOfTwoDivisor(divisor)
      ? (value & (divisor - 1)) === remainder
      : value % divisor === remainder;

    return result;
  }

  private static parseModuloRecord(filterValue: FilterValueEntity.Type): Record<string, unknown> {
    // Only accept object format { divisor, remainder }
    if (typeof filterValue !== 'object' || filterValue === null || Array.isArray(filterValue) || !Predicates.isRecord(filterValue)) {
      throw new FilterOperatorError(`NUMBER.MODULO requires filter value to be an object with divisor and remainder properties, got ${typeof filterValue}`, {});
    }

    return filterValue;
  }

  private static parseModuloOperands(value: number, record: Record<string, unknown>): { 'divisor': number, 'remainder': number } | null {
    const divisor: unknown = Reflect.get(record, 'divisor');
    const remainder: unknown = Reflect.get(record, 'remainder');

    // Both must be numbers
    if (!Predicates.isNumber(divisor) || !Predicates.isNumber(remainder)) {
      return null;
    }

    if (isNaN(value) || isNaN(divisor) || isNaN(remainder) || divisor === 0) {
      return null;
    }

    return { 'divisor': divisor, 'remainder': remainder };
  }

  private static isPowerOfTwoDivisor(divisor: number): boolean {
    const result = divisor > 0 && (divisor & (divisor - 1)) === 0;

    return result;
  }

  static numberEquals(value: unknown, filterValue: FilterValueEntity.Type): boolean {
    if (typeof value !== 'number') {
      throw new FilterOperatorError(`NUMBER.EQUALS requires value to be a number, got ${typeof value}`, {});
    }
    if (typeof filterValue !== 'number') {
      throw new FilterOperatorError(`NUMBER.EQUALS requires filter value to be a number, got ${typeof filterValue}`, {});
    }

    const result = value === filterValue;

    return result;
  }

  static numberNotEquals(value: unknown, filterValue: FilterValueEntity.Type): boolean {
    if (typeof value !== 'number') {
      throw new FilterOperatorError(`NUMBER.NOT_EQUALS requires value to be a number, got ${typeof value}`, {});
    }
    if (typeof filterValue !== 'number') {
      throw new FilterOperatorError(`NUMBER.NOT_EQUALS requires filter value to be a number, got ${typeof filterValue}`, {});
    }

    const result = value !== filterValue;

    return result;
  }

  // Numeric similarity based on relative difference
  static calculateNumericSimilarity(value1: number, value2: number): number {
    if (value1 === value2) {
      return 1;
    }
    if (Number.isNaN(value1) && Number.isNaN(value2)) {
      return 1;
    }
    if (Number.isNaN(value1) || Number.isNaN(value2)) {
      return 0;
    }
    if (!Number.isFinite(value1) || !Number.isFinite(value2)) {
      const result = (value1 === value2) ? 1 : 0;

      return result;
    }

    const maximum = Math.max(Math.abs(value1), Math.abs(value2));

    if (maximum === 0) {
      return 1;
    }

    const diff = Math.abs(value1 - value2);
    const similarity = Math.max(0, 1 - (diff / maximum));

    return similarity;
  }

  // Number similarity using relative difference
  static numberSimilarity(value: unknown, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: unknown }): boolean {
    if (typeof value !== 'number') {
      throw new FilterOperatorError(`NUMBER.SIMILARITY requires value to be a number, got ${typeof value}`, {});
    }
    if (typeof filterValue !== 'number') {
      throw new FilterOperatorError(`NUMBER.SIMILARITY requires filter value to be a number, got ${typeof filterValue}`, {});
    }
    if (typeof options?.condition?.threshold !== 'number') {
      throw new FilterOperatorError('NUMBER.SIMILARITY requires a numeric threshold parameter', {});
    }

    const threshold = options.condition.threshold;
    const similarity = NumberOperators.calculateNumericSimilarity(value, filterValue);

    const result = similarity >= threshold;

    return result;
  }
}
