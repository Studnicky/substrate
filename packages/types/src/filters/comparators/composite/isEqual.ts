/**
 * Case-aware equality comparison
 */

import type {
  FilterCondition
} from '../../types.js';

import { Guard } from '../../../guards/Guard.js';
import { areNaNStrict } from '../atomic/areNaNStrict.js';
import { areNullUndefinedEqual } from '../atomic/areNullUndefinedEqual.js';
import { areObjectsReferenceEqual } from '../atomic/areObjectsReferenceEqual.js';
import { areTypesSame } from '../atomic/areTypesSame.js';
import { areStringsEqual } from './areStringsEqual.js';

/**
 * Handles string equality with case sensitivity support
 */
function handleStringEquality(
  value: unknown,
  filterValue: unknown,
  condition: FilterCondition
): boolean | null {
  if (Guard.isString(value) && Guard.isString(filterValue)) {
    return areStringsEqual(value, filterValue, condition);
  }

  // Not strings, continue with other checks
  return null;
}

/**
 * Handles number equality with decimal precision support
 */
function handleNumberEquality(
  value: unknown,
  filterValue: unknown,
  condition: FilterCondition
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

      return roundedValue === roundedFilterValue;
    }

    // No decimal precision specified, use strict equality
    return value === filterValue;
  }

  // Not numbers, continue with other checks
  return null;
}

/**
 * Checks if two values are equal with case sensitivity and decimal precision support
 */
export function areValuesStrictEqual(
  value: unknown,
  filterValue: unknown,
  condition: FilterCondition = {}
): boolean {
  // Handle NaN specially - NaN should not equal NaN (JavaScript semantics)
  if (typeof value === 'number' && typeof filterValue === 'number') {
    if (Number.isNaN(value) || Number.isNaN(filterValue)) {
      return areNaNStrict(value, filterValue);
    }
  }

  // Quick reference equality check
  if (value === filterValue) {
    return true;
  }

  // Handle null/undefined
  if (value === null || value === undefined || filterValue === null || filterValue === undefined) {
    return areNullUndefinedEqual(value, filterValue);
  }

  // Handle objects and arrays - use reference equality for all objects
  if ((typeof value === 'object' && value !== null) || (typeof filterValue === 'object' && filterValue !== null)) {
    return areObjectsReferenceEqual(value, filterValue);
  }

  // Strict type checking - no automatic coercion
  if (!areTypesSame(value, filterValue)) {
    return false;
  }

  // For strings, handle case sensitivity
  const stringResult = handleStringEquality(value, filterValue, condition);

  if (stringResult !== null) {
    return stringResult;
  }

  // For numbers, handle decimal precision if specified
  const numberResult = handleNumberEquality(value, filterValue, condition);

  if (numberResult !== null) {
    return numberResult;
  }

  // For booleans, etc., use strict equality
  return value === filterValue;
}
