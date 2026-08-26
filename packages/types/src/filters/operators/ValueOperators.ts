import type { FilterValueEntity } from '../FilterValueEntity.js';
/**
 * @module ValueOperators
 * @description General value operation implementations for FilterEngine
 */
import type { FilterConditionInterface } from '../interfaces.js';

import { AreDeeplyEqual } from '../comparators/composite/areDeeplyEqual.js';
import { AreValuesStrictEqual } from '../comparators/composite/areValuesStrictEqual.js';

/**
 * General value operation implementations
 */
export class ValueOperators {
  /**
   * Checks if a value is absent (undefined)
   * @param {*} value - Value to check
   * @returns {boolean} True if value is undefined
   */
  static handleAbsent(value: FilterValueEntity.Type) {
    const result = value === undefined;

    return result;
  }

  /**
   * Checks if a value is defined (not undefined)
   * @param {*} value - Value to check
   * @returns {boolean} True if value is not undefined
   */
  static handleDefined(value: FilterValueEntity.Type) {
    const result = value !== undefined;

    return result;
  }

  /**
   * Checks if two values are equal (loose equality)
   * @param {*} value - First value
   * @param {*} filterValue - Second value
   * @param {Object} condition - Compiled condition
   * @returns {boolean} True if values are equal
   */
  static handleEquals(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }) {
    const comparisonCondition = options?.condition ?? {};
    const result = AreValuesStrictEqual.areValuesStrictEqual(value, filterValue, comparisonCondition);

    return result;
  }

  /**
   * Checks if a value exists (not undefined)
   * @param {*} value - Value to check
   * @returns {boolean} True if value is not undefined
   */
  static handleExists(value: FilterValueEntity.Type) {
    const result = value !== undefined;

    return result;
  }

  /**
   * Checks if two values are deeply identical
   * @param {*} value - First value
   * @param {*} filterValue - Second value
   * @param {Object} condition - Compiled condition
   * @returns {boolean} True if values are deeply identical
   */
  static handleIdentical(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }) {
    const comparisonCondition = options?.condition ?? {};
    const result = AreDeeplyEqual.areDeeplyEqual(value, filterValue, comparisonCondition);

    return result;
  }

  /**
   * Checks if a value is in a provided array
   * @param {*} value - Value to check
   * @param {Array} filterValue - Array to search in
   * @returns {boolean} True if value is in array
   */
  static handleIn(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type) {
    if (!Array.isArray(filterValue)) {
      return false;
    }

    const result = (filterValue as unknown[]).includes(value);

    return result;
  }

  /**
   * Checks if two values are not equal (loose equality)
   * @param {*} value - First value
   * @param {*} filterValue - Second value
   * @param {Object} condition - Compiled condition
   * @returns {boolean} True if values are not equal
   */
  static handleNotEquals(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }) {
    const result = !AreValuesStrictEqual.areValuesStrictEqual(value, filterValue, options?.condition);

    return result;
  }

  /**
   * Checks if two values are not deeply identical
   * @param {*} value - First value
   * @param {*} filterValue - Second value
   * @param {Object} condition - Compiled condition
   * @returns {boolean} True if values are not deeply identical
   */
  static handleNotIdentical(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }) {
    const result = !AreDeeplyEqual.areDeeplyEqual(value, filterValue, options?.condition);

    return result;
  }

  /**
   * Checks if a value is not in a provided array
   * @param {*} value - Value to check
   * @param {Array} filterValue - Array to search in
   * @returns {boolean} True if value is not in array
   */
  static handleNotIn(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type) {
    if (!Array.isArray(filterValue)) {
      return false;
    }

    const result = !(filterValue as unknown[]).includes(value);

    return result;
  }

  /**
   * Checks if a value is not null
   * @param {*} value - Value to check
   * @returns {boolean} True if value is not null
   */
  static handleNotNull(value: FilterValueEntity.Type) {
    const result = value !== null;

    return result;
  }

  /**
   * Checks if a value is null
   * @param {*} value - Value to check
   * @returns {boolean} True if value is null
   */
  static handleNull(value: FilterValueEntity.Type) {
    const result = value === null;

    return result;
  }

  /**
   * Checks the type of a value (constructor name)
   * @param {*} value - Value to check
   * @param {*} filterValue - Type name to match
   * @returns {boolean} True if types match
   */
  static handleType(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type) {
    if (typeof filterValue !== 'string') {
      return false;
    }

    if (value === null) {
      const result = filterValue === 'null';

      return result;
    }

    if (value === undefined) {
      const result = filterValue === 'undefined';

      return result;
    }

    const actualType = Reflect.apply(Object.prototype.toString, value, []).slice(8, -1);
    const result = actualType === filterValue;

    return result;
  }

  /**
   * Checks the typeof a value
   * @param {*} value - Value to check
   * @param {*} filterValue - typeof result to match
   * @returns {boolean} True if typeof results match
   */
  static handleTypeof(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type) {
    if (typeof filterValue !== 'string') {
      return false;
    }

    const result = typeof value === filterValue;

    return result;
  }

  /**
   * Checks if a value is undefined
   * @param {*} value - Value to check
   * @returns {boolean} True if value is undefined
   */
  static handleUndefined(value: unknown) {
    const result = value === undefined;

    return result;
  }
}
