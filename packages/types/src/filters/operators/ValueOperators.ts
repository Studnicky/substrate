/**
 * @module ValueOperators
 * @description General value operation implementations for FilterEngine
 */
import type { FilterCondition, FilterValue } from '../types.js';

import { areDeeplyEqual } from '../comparators/composite/deepEquals.js';
import { areValuesStrictEqual } from '../comparators/composite/isEqual.js';

/**
 * General value operation implementations
 */
export class ValueOperators {
  /**
   * Checks if a value is absent (undefined)
   * @param {*} value - Value to check
   * @returns {boolean} True if value is undefined
   */
  static handleAbsent(value: FilterValue) {
    return value === undefined;
  }

  /**
   * Checks if a value is defined (not undefined)
   * @param {*} value - Value to check
   * @returns {boolean} True if value is not undefined
   */
  static handleDefined(value: FilterValue) {
    return value !== undefined;
  }

  /**
   * Checks if two values are equal (loose equality)
   * @param {*} value - First value
   * @param {*} filterValue - Second value
   * @param {Object} condition - Compiled condition
   * @returns {boolean} True if values are equal
   */
  static handleEquals(value: FilterValue, filterValue: FilterValue, condition?: FilterCondition) {
    return areValuesStrictEqual(value, filterValue, condition);
  }

  /**
   * Checks if a value exists (not undefined)
   * @param {*} value - Value to check
   * @returns {boolean} True if value is not undefined
   */
  static handleExists(value: FilterValue) {
    return value !== undefined;
  }

  /**
   * Checks if two values are deeply identical
   * @param {*} value - First value
   * @param {*} filterValue - Second value
   * @param {Object} condition - Compiled condition
   * @returns {boolean} True if values are deeply identical
   */
  static handleIdentical(value: FilterValue, filterValue: FilterValue, condition?: FilterCondition) {
    return areDeeplyEqual(value, filterValue, condition);
  }

  /**
   * Checks if a value is in a provided array
   * @param {*} value - Value to check
   * @param {Array} filterValue - Array to search in
   * @returns {boolean} True if value is in array
   */
  static handleIn(value: FilterValue, filterValue: FilterValue) {
    if (!Array.isArray(filterValue)) {
      return false;
    }

    return filterValue.includes(value);
  }

  /**
   * Checks if two values are not equal (loose equality)
   * @param {*} value - First value
   * @param {*} filterValue - Second value
   * @param {Object} condition - Compiled condition
   * @returns {boolean} True if values are not equal
   */
  static handleNotEquals(value: FilterValue, filterValue: FilterValue, condition?: FilterCondition) {
    return !areValuesStrictEqual(value, filterValue, condition);
  }

  /**
   * Checks if two values are not deeply identical
   * @param {*} value - First value
   * @param {*} filterValue - Second value
   * @param {Object} condition - Compiled condition
   * @returns {boolean} True if values are not deeply identical
   */
  static handleNotIdentical(value: FilterValue, filterValue: FilterValue, condition?: FilterCondition) {
    return !areDeeplyEqual(value, filterValue, condition);
  }

  /**
   * Checks if a value is not in a provided array
   * @param {*} value - Value to check
   * @param {Array} filterValue - Array to search in
   * @returns {boolean} True if value is not in array
   */
  static handleNotIn(value: FilterValue, filterValue: FilterValue) {
    if (!Array.isArray(filterValue)) {
      return false;
    }

    return !filterValue.includes(value);
  }

  /**
   * Checks if a value is not null
   * @param {*} value - Value to check
   * @returns {boolean} True if value is not null
   */
  static handleNotNull(value: FilterValue) {
    return value !== null;
  }

  /**
   * Checks if a value is null
   * @param {*} value - Value to check
   * @returns {boolean} True if value is null
   */
  static handleNull(value: FilterValue) {
    return value === null;
  }

  /**
   * Checks the type of a value (constructor name)
   * @param {*} value - Value to check
   * @param {*} filterValue - Type name to match
   * @returns {boolean} True if types match
   */
  static handleType(value: FilterValue, filterValue: FilterValue) {
    if (typeof filterValue !== 'string') {
      return false;
    }

    if (value === null) {
      return filterValue === 'null';
    }

    if (value === undefined) {
      return filterValue === 'undefined';
    }

    const actualType = Object.prototype.toString.call(value).slice(8, -1);

    return actualType === filterValue;
  }

  /**
   * Checks the typeof a value
   * @param {*} value - Value to check
   * @param {*} filterValue - typeof result to match
   * @returns {boolean} True if typeof results match
   */
  static handleTypeof(value: FilterValue, filterValue: FilterValue) {
    if (typeof filterValue !== 'string') {
      return false;
    }

    return typeof value === filterValue;
  }

  /**
   * Checks if a value is undefined
   * @param {*} value - Value to check
   * @returns {boolean} True if value is undefined
   */
  static handleUndefined(value: unknown) {
    return value === undefined;
  }
}
