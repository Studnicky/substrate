import type { FilterCondition, FilterValue } from '../types.js';

/**
 * @module ObjectOperators
 * @description Object operation implementations for FilterEngine
 */
import { Guard } from '../../guards/Guard.js';


/**
 * Object operation implementations
 */
export class ObjectOperators {
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

    if (a instanceof RegExp && b instanceof RegExp) {
      return a.source === b.source && a.flags === b.flags;
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

    if (a instanceof Set && b instanceof Set) {
      if (a.size !== b.size) {
        return false;
      }
      for (const item of a) {
        if (!b.has(item)) {
          return false;
        }
      }

      return true;
    }

    // Handle plain objects
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
   * Helper method to check if a value is a plain object
   * @private
   */
  static isPlainObjectValue(value: FilterValue): value is Record<string, FilterValue> {
    const result = Guard.isRecord(value) && !(value instanceof RegExp);
    return result;
  }

  /**
   * Checks if object includes all specified key-value pairs
   * @param {*} value - Object to check
   * @param {*} filterValue - Object with key-value pairs to check for
   * @returns {boolean} True if object includes all specified key-value pairs
   * @throws {Error} If value or filterValue is not a plain object
   */
  static handleDeepIncludes(value: FilterValue, filterValue: FilterValue) {
    if (!this.isPlainObjectValue(value)) {
      throw new Error(`OBJECT.DEEP_INCLUDES requires value to be a plain object, got ${typeof value}`);
    }
    if (!this.isPlainObjectValue(filterValue)) {
      throw new Error(`OBJECT.DEEP_INCLUDES requires filter value to be a plain object, got ${typeof filterValue}`);
    }

    for (const key in filterValue) {
      if (Object.prototype.hasOwnProperty.call(filterValue, key)) {
        if (!Object.prototype.hasOwnProperty.call(value, key)) {
          return false;
        }
        if (!this.deepEqual(value[key], filterValue[key])) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Checks if object is empty (has no properties)
   * @param {*} value - Object to check
   * @returns {boolean} True if object is empty
   * @throws {Error} If value is not a plain object
   */
  static handleEmpty(value: FilterValue) {
    if (!this.isPlainObjectValue(value)) {
      throw new Error(`OBJECT.EMPTY requires value to be a plain object, got ${typeof value}`);
    }

    return Object.keys(value).length === 0;
  }

  /**
   * Checks if two objects are equal (deep comparison)
   * @param {*} value - Value to check
   * @param {*} filterValue - Object to compare against
   * @returns {boolean} True if objects are deeply equal
   * @throws {Error} If either value is not a plain object
   */
  static handleEquals(value: FilterValue, filterValue: FilterValue) {
    if (!this.isPlainObjectValue(value)) {
      throw new Error(`OBJECT.EQUALS requires value to be a plain object, got ${typeof value}`);
    }
    if (!this.isPlainObjectValue(filterValue)) {
      throw new Error(`OBJECT.EQUALS requires filter value to be a plain object, got ${typeof filterValue}`);
    }

    return this.deepEqual(value, filterValue);
  }

  /**
   * Checks if object has a specific property
   * @param {*} value - Object to check
   * @param {*} filterValue - Property name to check for
   * @returns {boolean} True if object has the property
   * @throws {Error} If value is not a plain object or filterValue is not a string
   */
  static handleHasProperty(value: FilterValue, filterValue: FilterValue) {
    if (!this.isPlainObjectValue(value)) {
      throw new Error(`OBJECT.HAS_PROPERTY requires value to be a plain object, got ${typeof value}`);
    }
    if (typeof filterValue !== 'string') {
      throw new Error(`OBJECT.HAS_PROPERTY requires filter value to be a string, got ${typeof filterValue}`);
    }

    return Object.prototype.hasOwnProperty.call(value, filterValue);
  }

  /**
   * Checks if two objects are identical (same as equals for objects)
   * @param {*} value - Value to check
   * @param {*} filterValue - Object to compare against
   * @returns {boolean} True if objects are identical
   * @throws {Error} If either value is not a plain object
   */
  static handleIdentical(value: FilterValue, filterValue: FilterValue) {
    return this.handleEquals(value, filterValue);
  }

  /**
   * Checks if object does not have a specific property
   * @param {*} value - Object to check
   * @param {*} filterValue - Property name to check for
   * @returns {boolean} True if object does not have the property
   * @throws {Error} If value is not a plain object or filterValue is not a string
   */
  static handleMissingProperty(value: FilterValue, filterValue: FilterValue) {
    return !this.handleHasProperty(value, filterValue);
  }

  /**
   * Checks if object is not empty (has at least one property)
   * @param {*} value - Object to check
   * @returns {boolean} True if object is not empty
   * @throws {Error} If value is not a plain object
   */
  static handleNotEmpty(value: FilterValue) {
    return !this.handleEmpty(value);
  }

  /**
   * Checks if two objects are not equal
   * @param {*} value - Value to check
   * @param {*} filterValue - Object to compare against
   * @returns {boolean} True if objects are not equal
   * @throws {Error} If either value is not a plain object
   */
  static handleNotEquals(value: FilterValue, filterValue: FilterValue) {
    return !this.handleEquals(value, filterValue);
  }

  /**
   * Checks if two objects are not identical
   * @param {*} value - Value to check
   * @param {*} filterValue - Object to compare against
   * @returns {boolean} True if objects are not identical
   * @throws {Error} If either value is not a plain object
   */
  static handleNotIdentical(value: FilterValue, filterValue: FilterValue) {
    return !this.handleEquals(value, filterValue);
  }

  /**
   * Checks if object has a specific number of properties
   * @param {*} value - Object to check
   * @param {*} filterValue - Number of properties expected
   * @returns {boolean} True if object has the specified number of properties
   * @throws {Error} If value is not a plain object or filterValue is not a number
   */
  static handlePropertyCount(value: FilterValue, filterValue: FilterValue) {
    if (!this.isPlainObjectValue(value)) {
      throw new Error(`OBJECT.PROPERTY_COUNT requires value to be a plain object, got ${typeof value}`);
    }
    if (typeof filterValue !== 'number') {
      throw new Error(`OBJECT.PROPERTY_COUNT requires filter value to be a number, got ${typeof filterValue}`);
    }

    return Object.keys(value).length === filterValue;
  }

  /**
   * Computes object similarity based on matching key-value pairs
   * @param {*} value - Object to check
   * @param {*} filterValue - Object to compare against
   * @param {Object} condition - Filter condition with threshold
   * @returns {boolean} True if objects meet similarity threshold
   * @throws {Error} If values are not plain objects
   */
  static handleSimilarity(value: FilterValue, filterValue: FilterValue, condition?: FilterCondition) {
    if (!this.isPlainObjectValue(value)) {
      throw new Error(`OBJECT.SIMILARITY requires value to be a plain object, got ${typeof value}`);
    }
    if (!this.isPlainObjectValue(filterValue)) {
      throw new Error(`OBJECT.SIMILARITY requires filter value to be a plain object, got ${typeof filterValue}`);
    }

    const threshold = condition?.threshold ?? 0.8;

    if (typeof threshold !== 'number' || threshold < 0 || threshold > 1) {
      throw new Error('OBJECT.SIMILARITY threshold must be a number between 0 and 1');
    }

    const keysA = Object.keys(value);
    const keysB = Object.keys(filterValue);
    const allKeys = new Set([
      ...keysA,
      ...keysB
    ]);

    if (allKeys.size === 0) {
      return true; // Both empty objects are 100% similar
    }

    let matches = 0;

    for (const key of allKeys) {
      if (Object.prototype.hasOwnProperty.call(value, key)
          && Object.prototype.hasOwnProperty.call(filterValue, key)
          && this.deepEqual(value[key], filterValue[key])) {
        matches++;
      }
    }

    const similarity = matches / allKeys.size;

    return similarity >= threshold;
  }
}
