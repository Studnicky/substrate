/**
 * Case-aware equality comparison
 */


import { Predicates } from '#runtime';

import type {
  FilterConditionInterface
} from '../../interfaces.js';

import { AreStringsEqual } from './areStringsEqual.js';

/**
 * Checks if two values are equal with case sensitivity and decimal precision support
 */
export class AreValuesStrictEqual {
  static areValuesStrictEqual(
    value: unknown,
    filterValue: unknown,
    condition: FilterConditionInterface = {}
  ): boolean {
    const nanResult = AreValuesStrictEqual.compareNaN(value, filterValue);

    if (nanResult !== null) {
      return nanResult;
    }

    // Quick reference equality check
    if (value === filterValue) {
      return true;
    }

    const nullishResult = AreValuesStrictEqual.compareNullish(value, filterValue);

    if (nullishResult !== null) {
      return nullishResult;
    }

    // Handle objects and arrays - use reference equality for all objects
    if (AreValuesStrictEqual.isObjectLike(value) || AreValuesStrictEqual.isObjectLike(filterValue)) {
      const result = Predicates.areObjectsReferenceEqual(value, filterValue);
      return result;
    }

    // Strict type checking - no automatic coercion
    if (!Predicates.areTypesSame(value, filterValue)) {
      return false;
    }

    // For strings, handle case sensitivity
    const stringResult = AreValuesStrictEqual.handleStringEquality(value, filterValue, condition);

    if (stringResult !== null) {
      return stringResult;
    }

    // For numbers, handle decimal precision if specified
    const numberResult = AreValuesStrictEqual.handleNumberEquality(value, filterValue, condition);

    if (numberResult !== null) {
      return numberResult;
    }

    // For booleans, etc., use strict equality
    const result = value === filterValue;
    return result;
  }

  /** NaN should not equal NaN (JavaScript semantics); `null` means neither operand is a NaN number. */
  private static compareNaN(value: unknown, filterValue: unknown): boolean | null {
    if (typeof value !== 'number' || typeof filterValue !== 'number') {
      return null;
    }
    if (!Number.isNaN(value) && !Number.isNaN(filterValue)) {
      return null;
    }

    const result = Predicates.areNaNStrict(value, filterValue);

    return result;
  }

  /** `null` when neither operand is null or undefined. */
  private static compareNullish(value: unknown, filterValue: unknown): boolean | null {
    if (value === null || value === undefined || filterValue === null || filterValue === undefined) {
      const result = Predicates.areNullUndefinedEqual(value, filterValue);

      return result;
    }

    return null;
  }

  private static isObjectLike(value: unknown): boolean {
    const result = typeof value === 'object' && value !== null;

    return result;
  }

  /**
   * Handles string equality with case sensitivity support
   */
  private static handleStringEquality(
    value: unknown,
    filterValue: unknown,
    condition: FilterConditionInterface
  ): boolean | null {
    if (Predicates.isString(value) && Predicates.isString(filterValue)) {
      const result = AreStringsEqual.areStringsEqual(value, filterValue, condition);
      return result;
    }

    // Not strings, continue with other checks
    return null;
  }

  /**
   * Handles number equality with decimal precision support
   */
  private static handleNumberEquality(
    value: unknown,
    filterValue: unknown,
    condition: FilterConditionInterface
  ): boolean | null {
    if (typeof value === 'number' && typeof filterValue === 'number') {
      // Check if decimal precision is specified in condition
      if (condition.decimalPrecision !== undefined && typeof condition.decimalPrecision === 'number') {
        const flooredPrecision = Math.floor(condition.decimalPrecision);
        const precision = Math.max(0, flooredPrecision);
        const factor = Math.pow(10, precision);

        // Round both values to the specified precision
        const roundedValue = Math.round(value * factor) / factor;
        const roundedFilterValue = Math.round(filterValue * factor) / factor;

        const result = roundedValue === roundedFilterValue;
        return result;
      }

      // No decimal precision specified, use strict equality
      const result = value === filterValue;
      return result;
    }

    // Not numbers, continue with other checks
    return null;
  }
}
