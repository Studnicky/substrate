import type { FilterValue } from '../types.js';

/**
 * @module MapOperators
 * @description Map operation implementations for FilterEngine
 */
import { Guard } from '../../guards/Guard.js';


/**
 * Map operation implementations
 */
export class MapOperators {
  /**
   * Helper method for deep equality comparison
   * @private
   */
  static deepEqual(a: unknown, b: unknown) {
    if (a === b) {
      return true;
    }

    if (a === null || a === undefined || b === null || b === undefined) {
      return a === b;
    }

    if (typeof a !== typeof b) {
      return false;
    }

    if (typeof a !== 'object') {
      return a === b;
    }

    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    }

    if (a instanceof Map && b instanceof Map) {
      if (a.size !== b.size) {
        return false;
      }
      for (const [
        key,
        val
      ] of a) {
        if (!b.has(key) || !this.deepEqual(val, b.get(key))) {
          return false;
        }
      }

      return true;
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

    for (const key of keysA) {
      if (!keysB.includes(key)) {
        return false;
      }
      if (!this.deepEqual(a[key], b[key])) {
        return false;
      }
    }

    return true;
  }

  /**
   * Checks if a Map is empty
   * @param {*} value - Value to check
   * @returns {boolean} True if Map is empty
   * @throws {Error} If value is not a Map
   */
  static handleEmpty(value: FilterValue) {
    if (!(value instanceof Map)) {
      throw new Error(`MAP.EMPTY requires value to be a Map, got ${typeof value}`);
    }

    return value.size === 0;
  }

  /**
   * Checks if two Maps are equal (deep comparison)
   * @param {*} value - Value to check
   * @param {*} filterValue - Map to compare against
   * @returns {boolean} True if Maps are deeply equal
   * @throws {Error} If either value is not a Map
   */
  static handleEquals(value: FilterValue, filterValue: FilterValue) {
    if (!(value instanceof Map)) {
      throw new Error(`MAP.EQUALS requires value to be a Map, got ${typeof value}`);
    }
    if (!(filterValue instanceof Map)) {
      throw new Error(`MAP.EQUALS requires filter value to be a Map, got ${typeof filterValue}`);
    }

    if (value.size !== filterValue.size) {
      return false;
    }

    for (const [
      key,
      val
    ] of value) {
      if (!filterValue.has(key) || !this.deepEqual(val, filterValue.get(key))) {
        return false;
      }
    }

    return true;
  }

  /**
   * Checks if a Map has a specific key
   * @param {*} value - Map to check
   * @param {*} filterValue - Key to look for
   * @returns {boolean} True if Map has the key
   * @throws {Error} If value is not a Map
   */
  static handleHas(value: FilterValue, filterValue: FilterValue) {
    if (!(value instanceof Map)) {
      throw new Error(`MAP.HAS requires value to be a Map, got ${typeof value}`);
    }

    return Guard.isString(filterValue) && value.has(filterValue);
  }

  /**
   * Checks if two Maps are identical (same as equals for Maps)
   * @param {*} value - Value to check
   * @param {*} filterValue - Map to compare against
   * @returns {boolean} True if Maps are identical
   * @throws {Error} If either value is not a Map
   */
  static handleIdentical(value: FilterValue, filterValue: FilterValue) {
    return this.handleEquals(value, filterValue);
  }

  /**
   * Checks if a Map is missing a specific key
   * @param {*} value - Map to check
   * @param {*} filterValue - Key to check absence of
   * @returns {boolean} True if Map does not have the key
   * @throws {Error} If value is not a Map
   */
  static handleMissing(value: FilterValue, filterValue: FilterValue) {
    if (!(value instanceof Map)) {
      throw new Error(`MAP.MISSING requires value to be a Map, got ${typeof value}`);
    }

    return !Guard.isString(filterValue) || !value.has(filterValue);
  }

  /**
   * Checks if a Map is not empty
   * @param {*} value - Value to check
   * @returns {boolean} True if Map is not empty
   * @throws {Error} If value is not a Map
   */
  static handleNotEmpty(value: FilterValue) {
    if (!(value instanceof Map)) {
      throw new Error(`MAP.NOT_EMPTY requires value to be a Map, got ${typeof value}`);
    }

    return value.size > 0;
  }

  /**
   * Checks if two Maps are not equal
   * @param {*} value - Value to check
   * @param {*} filterValue - Map to compare against
   * @returns {boolean} True if Maps are not equal
   * @throws {Error} If either value is not a Map
   */
  static handleNotEquals(value: FilterValue, filterValue: FilterValue) {
    return !this.handleEquals(value, filterValue);
  }

  /**
   * Checks if two Maps are not identical
   * @param {*} value - Value to check
   * @param {*} filterValue - Map to compare against
   * @returns {boolean} True if Maps are not identical
   * @throws {Error} If either value is not a Map
   */
  static handleNotIdentical(value: FilterValue, filterValue: FilterValue) {
    return !this.handleEquals(value, filterValue);
  }

  /**
   * Checks if a Map has a specific size
   * @param {*} value - Map to check
   * @param {*} filterValue - Expected size
   * @returns {boolean} True if Map size matches
   * @throws {Error} If value is not a Map or filterValue is not a number
   */
  static handleSize(value: FilterValue, filterValue: FilterValue) {
    if (!(value instanceof Map)) {
      throw new Error(`MAP.SIZE requires value to be a Map, got ${typeof value}`);
    }
    if (typeof filterValue !== 'number') {
      throw new Error(`MAP.SIZE requires filter value to be a number, got ${typeof filterValue}`);
    }

    return value.size === filterValue;
  }
}
