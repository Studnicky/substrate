/**
 * @module MapOperators
 * @description Map operation implementations for FilterEngine
 */
import { Predicates } from '../../predicates/Predicates.js';


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

    if (a instanceof Date && b instanceof Date) {
      const result = a.getTime() === b.getTime();
      return result;
    }

    if (a instanceof Map && b instanceof Map) {
      if (a.size !== b.size) {
        return false;
      }
      for (const [
        key,
        mapEntryValue
      ] of a) {
        if (!b.has(key) || !this.deepEqual(mapEntryValue, b.get(key))) {
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

    if (!Predicates.isRecord(a) || !Predicates.isRecord(b)) {
      return false;
    }

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) {
      return false;
    }

    const keysBSet = new Set(keysB);

    for (let index = 0; index < keysA.length; index += 1) {
      const key = keysA[index];
      if (key === undefined) {
        continue;
      }
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
   * Checks if a Map is empty
   * @param {*} value - Value to check
   * @returns {boolean} True if Map is empty
   * @throws {Error} If value is not a Map
   */
  static handleEmpty(value: unknown) {
    if (!(value instanceof Map)) {
      throw new Error(`MAP.EMPTY requires value to be a Map, got ${typeof value}`);
    }

    const result = value.size === 0;
    return result;
  }

  /**
   * Checks if two Maps are equal (deep comparison)
   * @param {*} value - Value to check
   * @param {*} filterValue - Map to compare against
   * @returns {boolean} True if Maps are deeply equal
   * @throws {Error} If either value is not a Map
   */
  static handleEquals(value: unknown, filterValue: unknown) {
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
      mapEntryValue
    ] of value) {
      if (!filterValue.has(key) || !this.deepEqual(mapEntryValue, filterValue.get(key))) {
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
  static handleHas(value: unknown, filterValue: unknown) {
    if (!(value instanceof Map)) {
      throw new Error(`MAP.HAS requires value to be a Map, got ${typeof value}`);
    }

    const result = Predicates.isString(filterValue) && value.has(filterValue);
    return result;
  }

  /**
   * Checks if two Maps are identical (same as equals for Maps)
   * @param {*} value - Value to check
   * @param {*} filterValue - Map to compare against
   * @returns {boolean} True if Maps are identical
   * @throws {Error} If either value is not a Map
   */
  static handleIdentical(value: unknown, filterValue: unknown) {
    const result = this.handleEquals(value, filterValue);
    return result;
  }

  /**
   * Checks if a Map is missing a specific key
   * @param {*} value - Map to check
   * @param {*} filterValue - Key to check absence of
   * @returns {boolean} True if Map does not have the key
   * @throws {Error} If value is not a Map
   */
  static handleMissing(value: unknown, filterValue: unknown) {
    if (!(value instanceof Map)) {
      throw new Error(`MAP.MISSING requires value to be a Map, got ${typeof value}`);
    }

    const result = !Predicates.isString(filterValue) || !value.has(filterValue);
    return result;
  }

  /**
   * Checks if a Map is not empty
   * @param {*} value - Value to check
   * @returns {boolean} True if Map is not empty
   * @throws {Error} If value is not a Map
   */
  static handleNotEmpty(value: unknown) {
    if (!(value instanceof Map)) {
      throw new Error(`MAP.NOT_EMPTY requires value to be a Map, got ${typeof value}`);
    }

    const result = value.size > 0;
    return result;
  }

  /**
   * Checks if two Maps are not equal
   * @param {*} value - Value to check
   * @param {*} filterValue - Map to compare against
   * @returns {boolean} True if Maps are not equal
   * @throws {Error} If either value is not a Map
   */
  static handleNotEquals(value: unknown, filterValue: unknown) {
    const result = !this.handleEquals(value, filterValue);
    return result;
  }

  /**
   * Checks if two Maps are not identical
   * @param {*} value - Value to check
   * @param {*} filterValue - Map to compare against
   * @returns {boolean} True if Maps are not identical
   * @throws {Error} If either value is not a Map
   */
  static handleNotIdentical(value: unknown, filterValue: unknown) {
    const result = !this.handleEquals(value, filterValue);
    return result;
  }

  /**
   * Checks if a Map has a specific size
   * @param {*} value - Map to check
   * @param {*} filterValue - Expected size
   * @returns {boolean} True if Map size matches
   * @throws {Error} If value is not a Map or filterValue is not a number
   */
  static handleSize(value: unknown, filterValue: unknown) {
    if (!(value instanceof Map)) {
      throw new Error(`MAP.SIZE requires value to be a Map, got ${typeof value}`);
    }
    if (typeof filterValue !== 'number') {
      throw new Error(`MAP.SIZE requires filter value to be a number, got ${typeof filterValue}`);
    }

    const result = value.size === filterValue;
    return result;
  }
}
