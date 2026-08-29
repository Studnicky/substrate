/**
 * @module ObjectOperators
 * @description Object operation implementations for FilterEngine
 */
import { Predicates } from '@studnicky/types';

import type { FilterValueEntity } from '../FilterValueEntity.js';
import type { FilterConditionInterface } from '../interfaces.js';

import { FilterOperatorError } from '../errors/FilterOperatorError.js';


/**
 * Object operation implementations
 */
export class ObjectOperators {
  /**
   * Helper method for deep equality comparison
   * @private
   */
  static deepEqual<Value>(a: Value, b: Value) {
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

    if (a instanceof RegExp && b instanceof RegExp) {
      const result = a.source === b.source && a.flags === b.flags;
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
   * Helper method to check if a value is a plain object
   * @private
   */
  static isPlainObjectValue(value: unknown): value is Record<string, FilterValueEntity.Type> {
    const result = Predicates.isRecord(value) && !(value instanceof RegExp);
    return result;
  }

  /**
   * Checks if object includes all specified key-value pairs
   * @param {*} value - Object to check
   * @param {*} filterValue - Object with key-value pairs to check for
   * @returns {boolean} True if object includes all specified key-value pairs
   * @throws {Error} If value or filterValue is not a plain object
   */
  static handleDeepIncludes(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type) {
    if (!this.isPlainObjectValue(value)) {
      throw new FilterOperatorError(`OBJECT.DEEP_INCLUDES requires value to be a plain object, got ${typeof value}`, { 'operator': 'OBJECT.DEEP_INCLUDES' });
    }
    if (!this.isPlainObjectValue(filterValue)) {
      throw new FilterOperatorError(`OBJECT.DEEP_INCLUDES requires filter value to be a plain object, got ${typeof filterValue}`, { 'operator': 'OBJECT.DEEP_INCLUDES' });
    }

    const filterKeys = Object.keys(filterValue);

    for (let index = 0; index < filterKeys.length; index += 1) {
      const key = filterKeys[index];
      if (key === undefined) {
        continue;
      }
      if (!Object.hasOwn(value, key)) {
        return false;
      }
      if (!this.deepEqual(value[key], filterValue[key])) {
        return false;
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
  static handleEmpty(value: FilterValueEntity.Type) {
    if (!this.isPlainObjectValue(value)) {
      throw new FilterOperatorError(`OBJECT.EMPTY requires value to be a plain object, got ${typeof value}`, { 'operator': 'OBJECT.EMPTY' });
    }

    const result = Object.keys(value).length === 0;
    return result;
  }

  /**
   * Checks if two objects are equal (deep comparison)
   * @param {*} value - Value to check
   * @param {*} filterValue - Object to compare against
   * @returns {boolean} True if objects are deeply equal
   * @throws {Error} If either value is not a plain object
   */
  static handleEquals(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type) {
    if (!this.isPlainObjectValue(value)) {
      throw new FilterOperatorError(`OBJECT.EQUALS requires value to be a plain object, got ${typeof value}`, { 'operator': 'OBJECT.EQUALS' });
    }
    if (!this.isPlainObjectValue(filterValue)) {
      throw new FilterOperatorError(`OBJECT.EQUALS requires filter value to be a plain object, got ${typeof filterValue}`, { 'operator': 'OBJECT.EQUALS' });
    }

    const result = this.deepEqual(value, filterValue);
    return result;
  }

  /**
   * Checks if object has a specific property
   * @param {*} value - Object to check
   * @param {*} filterValue - Property name to check for
   * @returns {boolean} True if object has the property
   * @throws {Error} If value is not a plain object or filterValue is not a string
   */
  static handleHasProperty(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type) {
    if (!this.isPlainObjectValue(value)) {
      throw new FilterOperatorError(`OBJECT.HAS_PROPERTY requires value to be a plain object, got ${typeof value}`, { 'operator': 'OBJECT.HAS_PROPERTY' });
    }
    if (typeof filterValue !== 'string') {
      throw new FilterOperatorError(`OBJECT.HAS_PROPERTY requires filter value to be a string, got ${typeof filterValue}`, { 'operator': 'OBJECT.HAS_PROPERTY' });
    }

    const result = Object.hasOwn(value, filterValue);
    return result;
  }

  /**
   * Checks if two objects are identical (same as equals for objects)
   * @param {*} value - Value to check
   * @param {*} filterValue - Object to compare against
   * @returns {boolean} True if objects are identical
   * @throws {Error} If either value is not a plain object
   */
  static handleIdentical(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type) {
    const result = this.handleEquals(value, filterValue);
    return result;
  }

  /**
   * Checks if object does not have a specific property
   * @param {*} value - Object to check
   * @param {*} filterValue - Property name to check for
   * @returns {boolean} True if object does not have the property
   * @throws {Error} If value is not a plain object or filterValue is not a string
   */
  static handleMissingProperty(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type) {
    const result = !this.handleHasProperty(value, filterValue);
    return result;
  }

  /**
   * Checks if object is not empty (has at least one property)
   * @param {*} value - Object to check
   * @returns {boolean} True if object is not empty
   * @throws {Error} If value is not a plain object
   */
  static handleNotEmpty(value: FilterValueEntity.Type) {
    const result = !this.handleEmpty(value);
    return result;
  }

  /**
   * Checks if two objects are not equal
   * @param {*} value - Value to check
   * @param {*} filterValue - Object to compare against
   * @returns {boolean} True if objects are not equal
   * @throws {Error} If either value is not a plain object
   */
  static handleNotEquals(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type) {
    const result = !this.handleEquals(value, filterValue);
    return result;
  }

  /**
   * Checks if two objects are not identical
   * @param {*} value - Value to check
   * @param {*} filterValue - Object to compare against
   * @returns {boolean} True if objects are not identical
   * @throws {Error} If either value is not a plain object
   */
  static handleNotIdentical(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type) {
    const result = !this.handleEquals(value, filterValue);
    return result;
  }

  /**
   * Checks if object has a specific number of properties
   * @param {*} value - Object to check
   * @param {*} filterValue - Number of properties expected
   * @returns {boolean} True if object has the specified number of properties
   * @throws {Error} If value is not a plain object or filterValue is not a number
   */
  static handlePropertyCount(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type) {
    if (!this.isPlainObjectValue(value)) {
      throw new FilterOperatorError(`OBJECT.PROPERTY_COUNT requires value to be a plain object, got ${typeof value}`, { 'operator': 'OBJECT.PROPERTY_COUNT' });
    }
    if (typeof filterValue !== 'number') {
      throw new FilterOperatorError(`OBJECT.PROPERTY_COUNT requires filter value to be a number, got ${typeof filterValue}`, { 'operator': 'OBJECT.PROPERTY_COUNT' });
    }

    const result = Object.keys(value).length === filterValue;
    return result;
  }

  /**
   * Computes object similarity based on matching key-value pairs
   * @param {*} value - Object to check
   * @param {*} filterValue - Object to compare against
   * @param {Object} condition - Filter condition with threshold
   * @returns {boolean} True if objects meet similarity threshold
   * @throws {Error} If values are not plain objects
   */
  static handleSimilarity(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }) {
    if (!this.isPlainObjectValue(value)) {
      throw new FilterOperatorError(`OBJECT.SIMILARITY requires value to be a plain object, got ${typeof value}`, { 'operator': 'OBJECT.SIMILARITY' });
    }
    if (!this.isPlainObjectValue(filterValue)) {
      throw new FilterOperatorError(`OBJECT.SIMILARITY requires filter value to be a plain object, got ${typeof filterValue}`, { 'operator': 'OBJECT.SIMILARITY' });
    }

    const threshold = options?.condition?.threshold ?? 0.8;

    if (typeof threshold !== 'number' || threshold < 0 || threshold > 1) {
      throw new FilterOperatorError('OBJECT.SIMILARITY threshold must be a number between 0 and 1', { 'operator': 'OBJECT.SIMILARITY' });
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
      if (Object.hasOwn(value, key)
          && Object.hasOwn(filterValue, key)
          && this.deepEqual(value[key], filterValue[key])) {
        matches++;
      }
    }

    const similarity = matches / allKeys.size;
    const result = similarity >= threshold;

    return result;
  }
}
