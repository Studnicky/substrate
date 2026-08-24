/**
 * @module SetOperators
 * @description Set operation implementations for FilterEngine
 */
import type { FilterValue } from '../types.js';


/**
 * Set operation implementations
 */
export class SetOperators {
  /**
   * Checks if a Set is empty
   * @param {*} value - Value to check (should be a Set)
   * @returns {boolean} True if Set is empty
   */
  static handleEmpty(value: FilterValue) {
    if (!(value instanceof Set)) {
      return false;
    }

    return value.size === 0;
  }

  /**
   * Checks if two Sets are equal (deep comparison)
   * @param {*} value - Value to check
   * @param {*} filterValue - Set to compare against
   * @returns {boolean} True if Sets are deeply equal
   * @throws {Error} If either value is not a Set
   */
  static handleEquals(value: FilterValue, filterValue: FilterValue) {
    if (!(value instanceof Set)) {
      throw new Error(`SET.EQUALS requires value to be a Set, got ${typeof value}`);
    }
    if (!(filterValue instanceof Set)) {
      throw new Error(`SET.EQUALS requires filter value to be a Set, got ${typeof filterValue}`);
    }

    if (value.size !== filterValue.size) {
      return false;
    }

    for (const item of value) {
      if (!filterValue.has(item)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Checks if a Set has a specific value
   * @param {*} value - Value to check (should be a Set)
   * @param {*} filterValue - Value to find in the Set
   * @returns {boolean} True if Set contains value
   */
  static handleHas(value: FilterValue, filterValue: FilterValue) {
    if (!(value instanceof Set)) {
      return false;
    }

    return value.has(filterValue);
  }

  /**
   * Checks if two Sets are identical (same as equals for Sets)
   * @param {*} value - Value to check
   * @param {*} filterValue - Set to compare against
   * @returns {boolean} True if Sets are identical
   * @throws {Error} If either value is not a Set
   */
  static handleIdentical(value: FilterValue, filterValue: FilterValue) {
    return this.handleEquals(value, filterValue);
  }

  /**
   * Checks if a Set is missing a specific value
   * @param {*} value - Value to check (should be a Set)
   * @param {*} filterValue - Value to check absence of
   * @returns {boolean} True if Set does not contain value
   */
  static handleMissing(value: FilterValue, filterValue: FilterValue) {
    if (!(value instanceof Set)) {
      return false;
    }

    return !value.has(filterValue);
  }

  /**
   * Checks if a Set is not empty
   * @param {*} value - Value to check (should be a Set)
   * @returns {boolean} True if Set is not empty
   */
  static handleNotEmpty(value: FilterValue) {
    if (!(value instanceof Set)) {
      return false;
    }

    return value.size > 0;
  }

  /**
   * Checks if two Sets are not equal
   * @param {*} value - Value to check
   * @param {*} filterValue - Set to compare against
   * @returns {boolean} True if Sets are not equal
   * @throws {Error} If either value is not a Set
   */
  static handleNotEquals(value: FilterValue, filterValue: FilterValue) {
    return !this.handleEquals(value, filterValue);
  }

  /**
   * Checks if two Sets are not identical
   * @param {*} value - Value to check
   * @param {*} filterValue - Set to compare against
   * @returns {boolean} True if Sets are not identical
   * @throws {Error} If either value is not a Set
   */
  static handleNotIdentical(value: FilterValue, filterValue: FilterValue) {
    return !this.handleEquals(value, filterValue);
  }

  /**
   * Checks the size of a Set
   * @param {*} value - Value to check (should be a Set)
   * @param {*} filterValue - Size to compare against
   * @returns {boolean} True if Set size matches
   */
  static handleSize(value: FilterValue, filterValue: FilterValue) {
    if (!(value instanceof Set)) {
      return false;
    }
    if (typeof filterValue !== 'number') {
      return false;
    }

    return value.size === filterValue;
  }
}
