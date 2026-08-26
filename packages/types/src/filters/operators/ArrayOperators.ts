import type { FilterValueEntity } from '../FilterValueEntity.js';

/**
 * @module ArrayOperators
 * @description Array operation implementations for FilterEngine
 */
import { Guard } from '../../guards/Guard.js';


/**
 * Array operation implementations
 */
export class ArrayOperators {
  /**
   * Helper method for deep equality comparison
   * @private
   */
  static deepEqual(a: unknown, b: unknown) {
    if (a === b) {
      return true;
    }

    if (a === null || a === undefined || b === null || b === undefined) {
      const result = a === b;

      return result;
    }

    if (typeof a !== typeof b) {
      return false;
    }

    if (typeof a !== 'object') {
      const result = a === b;

      return result;
    }

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) {
        return false;
      }
      for (let i = 0; i < a.length; i++) {
        if (!this.deepEqual(a[i], b[i])) {
          return false;
        }
      }

      return true;
    }

    if (Array.isArray(a) || Array.isArray(b)) {
      return false;
    }

    if (!Guard.isRecord(a) || !Guard.isRecord(b)) {
      return false;
    }

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) {
      return false;
    }

    const keysBSet = new Set(keysB);

    for (let i = 0; i < keysA.length; i++) {
      const key = keysA[i]!;

      if (!keysBSet.has(key)) {
        return false;
      }
      if (!this.deepEqual(a[key], b[key])) {
        return false;
      }
    }

    return true;
  }

  /**
   * Checks if an array is empty
   * @param {*} value - Value to check (should be an array)
   * @returns {boolean} True if array is empty
   */
  static handleEmpty(value: FilterValueEntity.Type) {
    if (!Array.isArray(value)) {
      return false;
    }

    const result = value.length === 0;

    return result;
  }

  /**
   * Checks if two arrays are equal using deep comparison
   * @param {*} value - Value to check
   * @param {*} filterValue - Array to compare against
   * @returns {boolean} True if arrays are deeply equal
   * @throws {Error} If either value is not an array
   */
  static handleEquals(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type) {
    if (!Array.isArray(value)) {
      throw new Error(`ARRAY.EQUALS requires value to be an array, got ${typeof value}`);
    }
    if (!Array.isArray(filterValue)) {
      throw new Error(`ARRAY.EQUALS requires filter value to be an array, got ${typeof filterValue}`);
    }

    if (value.length !== filterValue.length) {
      return false;
    }

    // Deep equality check
    for (let i = 0; i < value.length; i++) {
      if (!this.deepEqual(value[i], filterValue[i])) {
        return false;
      }
    }

    return true;
  }

  /**
   * Checks if an array excludes (does not include) a specific value
   * @param {*} value - Value to check (should be an array)
   * @param {*} filterValue - Value to check absence of
   * @returns {boolean} True if array does not include value
   */
  static handleExcludes(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type) {
    if (!Array.isArray(value)) {
      return false;
    }

    const result = !(value as unknown[]).includes(filterValue);

    return result;
  }

  /**
   * Checks if two arrays are identical (same as equals for arrays)
   * @param {*} value - Value to check
   * @param {*} filterValue - Array to compare against
   * @returns {boolean} True if arrays are identical
   * @throws {Error} If either value is not an array
   */
  static handleIdentical(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type) {
    const result = this.handleEquals(value, filterValue);

    return result;
  }

  /**
   * Checks if a value is in an array (array membership)
   * @param {*} value - Value to check for
   * @param {*} filterValue - Array to search in
   * @returns {boolean} True if value is found in array
   * @throws {Error} If filterValue is not an array
   */
  static handleIn(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type) {
    if (!Array.isArray(filterValue)) {
      throw new Error(`ARRAY.IN requires filter value to be an array, got ${typeof filterValue}`);
    }

    const result = (filterValue as unknown[]).includes(value);

    return result;
  }

  /**
   * Checks if an array includes a specific value
   * @param {*} value - Value to check (should be an array)
   * @param {*} filterValue - Value to find
   * @returns {boolean} True if array includes value
   */
  static handleIncludes(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type) {
    if (!Array.isArray(value)) {
      return false;
    }

    const result = (value as unknown[]).includes(filterValue);

    return result;
  }

  /**
   * Checks the length of an array
   * @param {*} value - Value to check (should be an array)
   * @param {*} filterValue - Length to compare against
   * @returns {boolean} True if array length matches
   */
  static handleLength(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type) {
    if (!Array.isArray(value)) {
      return false;
    }
    if (typeof filterValue !== 'number') {
      return false;
    }

    const result = value.length === filterValue;

    return result;
  }

  /**
   * Checks if an array is not empty
   * @param {*} value - Value to check (should be an array)
   * @returns {boolean} True if array is not empty
   */
  static handleNotEmpty(value: FilterValueEntity.Type) {
    if (!Array.isArray(value)) {
      return false;
    }

    const result = value.length > 0;

    return result;
  }

  /**
   * Checks if two arrays are not equal
   * @param {*} value - Value to check
   * @param {*} filterValue - Array to compare against
   * @returns {boolean} True if arrays are not equal
   * @throws {Error} If either value is not an array
   */
  static handleNotEquals(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type) {
    const result = !this.handleEquals(value, filterValue);

    return result;
  }

  /**
   * Checks if two arrays are not identical
   * @param {*} value - Value to check
   * @param {*} filterValue - Array to compare against
   * @returns {boolean} True if arrays are not identical
   * @throws {Error} If either value is not an array
   */
  static handleNotIdentical(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type) {
    const result = !this.handleEquals(value, filterValue);

    return result;
  }

  /**
   * Checks if a value is not in an array
   * @param {*} value - Value to check for
   * @param {*} filterValue - Array to search in
   * @returns {boolean} True if value is not found in array
   * @throws {Error} If filterValue is not an array
   */
  static handleNotIn(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type) {
    if (!Array.isArray(filterValue)) {
      throw new Error(`ARRAY.NOT_IN requires filter value to be an array, got ${typeof filterValue}`);
    }

    const result = !(filterValue as unknown[]).includes(value);

    return result;
  }
}
