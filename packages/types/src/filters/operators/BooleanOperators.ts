/**
 * @module BooleanOperators
 * @description Boolean operation implementations for FilterEngine
 */
import type { FilterValue } from '../types.js';


/**
 * Boolean operation implementations
 */
export class BooleanOperators {
  /**
   * Checks if two boolean values are equal (strict boolean-only comparison)
   * @param {*} value - Value to check
   * @param {*} filterValue - Boolean to compare against
   * @returns {boolean} True if booleans are exactly equal
   * @throws {Error} If either value is not a boolean
   */
  static handleEquals(value: FilterValue, filterValue: FilterValue) {
    if (typeof value !== 'boolean') {
      throw new Error(`BOOLEAN.EQUALS requires value to be a boolean, got ${typeof value}`);
    }
    if (typeof filterValue !== 'boolean') {
      throw new Error(`BOOLEAN.EQUALS requires filter value to be a boolean, got ${typeof filterValue}`);
    }

    return value === filterValue;
  }

  /**
   * Checks if a value is exactly false
   * @param {*} value - Value to check
   * @returns {boolean} True if value is boolean false
   */
  static handleFalse(value: FilterValue) {
    return value === false;
  }

  /**
   * Checks if a value is falsy
   * @param {*} value - Value to check
   * @returns {boolean} True if value is falsy
   */
  static handleFalsy(value: FilterValue) {
    return !value;
  }

  /**
   * Checks if two boolean values are identical (same as equals for booleans)
   * @param {*} value - Value to check
   * @param {*} filterValue - Boolean to compare against
   * @returns {boolean} True if booleans are identical
   * @throws {Error} If either value is not a boolean
   */
  static handleIdentical(value: FilterValue, filterValue: FilterValue) {
    if (typeof value !== 'boolean') {
      throw new Error(`BOOLEAN.IDENTICAL requires value to be a boolean, got ${typeof value}`);
    }
    if (typeof filterValue !== 'boolean') {
      throw new Error(`BOOLEAN.IDENTICAL requires filter value to be a boolean, got ${typeof filterValue}`);
    }

    return value === filterValue;
  }

  /**
   * Checks if two boolean values are not equal (strict boolean-only comparison)
   * @param {*} value - Value to check
   * @param {*} filterValue - Boolean to compare against
   * @returns {boolean} True if booleans are not equal
   * @throws {Error} If either value is not a boolean
   */
  static handleNotEquals(value: FilterValue, filterValue: FilterValue) {
    if (typeof value !== 'boolean') {
      throw new Error(`BOOLEAN.NOT_EQUALS requires value to be a boolean, got ${typeof value}`);
    }
    if (typeof filterValue !== 'boolean') {
      throw new Error(`BOOLEAN.NOT_EQUALS requires filter value to be a boolean, got ${typeof filterValue}`);
    }

    return value !== filterValue;
  }

  /**
   * Checks if two boolean values are not identical
   * @param {*} value - Value to check
   * @param {*} filterValue - Boolean to compare against
   * @returns {boolean} True if booleans are not identical
   * @throws {Error} If either value is not a boolean
   */
  static handleNotIdentical(value: FilterValue, filterValue: FilterValue) {
    if (typeof value !== 'boolean') {
      throw new Error(`BOOLEAN.NOT_IDENTICAL requires value to be a boolean, got ${typeof value}`);
    }
    if (typeof filterValue !== 'boolean') {
      throw new Error(`BOOLEAN.NOT_IDENTICAL requires filter value to be a boolean, got ${typeof filterValue}`);
    }

    return value !== filterValue;
  }

  /**
   * Checks if a value is exactly true
   * @param {*} value - Value to check
   * @returns {boolean} True if value is boolean true
   */
  static handleTrue(value: FilterValue) {
    return value === true;
  }

  /**
   * Checks if a value is truthy
   * @param {*} value - Value to check
   * @returns {boolean} True if value is truthy
   */
  static handleTruthy(value: FilterValue) {
    return Boolean(value);
  }
}
