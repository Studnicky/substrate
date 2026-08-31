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
  static readonly DEFAULT_SIMILARITY_THRESHOLD = 0.8;

  /**
   * Helper method for deep equality comparison
   * @private
   */
  static deepEqual<Value>(leftValue: Value, rightValue: Value): boolean {
    if (leftValue === rightValue) {
      return true;
    }

    if (leftValue === null || leftValue === undefined || rightValue === null || rightValue === undefined) {
      const result = leftValue === rightValue;

      return result;
    }

    if (typeof leftValue !== typeof rightValue) {
      return false;
    }

    if (typeof leftValue !== 'object') {
      const result = leftValue === rightValue;

      return result;
    }

    if (leftValue instanceof Date && rightValue instanceof Date) {
      const result = leftValue.getTime() === rightValue.getTime();

      return result;
    }

    if (leftValue instanceof RegExp && rightValue instanceof RegExp) {
      const result = leftValue.source === rightValue.source && leftValue.flags === rightValue.flags;

      return result;
    }

    if (Array.isArray(leftValue) && Array.isArray(rightValue)) {
      if (leftValue.length !== rightValue.length) {
        return false;
      }
      const leftLength = leftValue.length;
      for (let index = 0; index < leftLength; index += 1) {
        if (!ObjectOperators.deepEqual(leftValue[index], rightValue[index])) {
          return false;
        }
      }

      return true;
    }

    if (Array.isArray(leftValue) || Array.isArray(rightValue)) {
      return false;
    }

    if (leftValue instanceof Map && rightValue instanceof Map) {
      if (leftValue.size !== rightValue.size) {
        return false;
      }
      for (const [
        key,
        mapEntryValue
      ] of leftValue) {
        if (!rightValue.has(key) || !ObjectOperators.deepEqual(mapEntryValue, rightValue.get(key))) {
          return false;
        }
      }

      return true;
    }

    if (leftValue instanceof Set && rightValue instanceof Set) {
      if (leftValue.size !== rightValue.size) {
        return false;
      }
      for (const item of leftValue) {
        if (!rightValue.has(item)) {
          return false;
        }
      }

      return true;
    }

    // Handle plain objects
    if (!Predicates.isRecord(leftValue) || !Predicates.isRecord(rightValue)) {
      return false;
    }

    const keysA = Object.keys(leftValue);
    const keysB = Object.keys(rightValue);

    if (keysA.length !== keysB.length) {
      return false;
    }

    const keysBSet = new Set(keysB);

    const keysALength = keysA.length;
    for (let index = 0; index < keysALength; index += 1) {
      const key = keysA[index];

      if (key === undefined) {
        return false;
      }
      if (!keysBSet.has(key)) {
        return false;
      }
      if (!ObjectOperators.deepEqual(leftValue[key], rightValue[key])) {
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
  static handleDeepIncludes(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (!ObjectOperators.isPlainObjectValue(value)) {
      throw new FilterOperatorError(`OBJECT.DEEP_INCLUDES requires value to be a plain object, got ${typeof value}`, { 'operator': 'OBJECT.DEEP_INCLUDES' });
    }
    if (!ObjectOperators.isPlainObjectValue(filterValue)) {
      throw new FilterOperatorError(`OBJECT.DEEP_INCLUDES requires filter value to be a plain object, got ${typeof filterValue}`, { 'operator': 'OBJECT.DEEP_INCLUDES' });
    }

    const filterKeys = Object.keys(filterValue);

    const filterKeysLength = filterKeys.length;
    for (let index = 0; index < filterKeysLength; index += 1) {
      const key = filterKeys[index];

      if (key === undefined) {
        return false;
      }
      if (!Object.hasOwn(value, key)) {
        return false;
      }
      if (!ObjectOperators.deepEqual(value[key], filterValue[key])) {
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
  static handleEmpty(value: FilterValueEntity.Type): boolean {
    if (!ObjectOperators.isPlainObjectValue(value)) {
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
  static handleEquals(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (!ObjectOperators.isPlainObjectValue(value)) {
      throw new FilterOperatorError(`OBJECT.EQUALS requires value to be a plain object, got ${typeof value}`, { 'operator': 'OBJECT.EQUALS' });
    }
    if (!ObjectOperators.isPlainObjectValue(filterValue)) {
      throw new FilterOperatorError(`OBJECT.EQUALS requires filter value to be a plain object, got ${typeof filterValue}`, { 'operator': 'OBJECT.EQUALS' });
    }

    const result = ObjectOperators.deepEqual(value, filterValue);

    return result;
  }

  /**
   * Checks if object has a specific property
   * @param {*} value - Object to check
   * @param {*} filterValue - Property name to check for
   * @returns {boolean} True if object has the property
   * @throws {Error} If value is not a plain object or filterValue is not a string
   */
  static handleHasProperty(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (!ObjectOperators.isPlainObjectValue(value)) {
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
  /**
   * Checks if object does not have a specific property
   * @param {*} value - Object to check
   * @param {*} filterValue - Property name to check for
   * @returns {boolean} True if object does not have the property
   * @throws {Error} If value is not a plain object or filterValue is not a string
   */
  static handleMissingProperty(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    const result = !ObjectOperators.handleHasProperty(value, filterValue);

    return result;
  }

  /**
   * Checks if object is not empty (has at least one property)
   * @param {*} value - Object to check
   * @returns {boolean} True if object is not empty
   * @throws {Error} If value is not a plain object
   */
  static handleNotEmpty(value: FilterValueEntity.Type): boolean {
    const result = !ObjectOperators.handleEmpty(value);

    return result;
  }

  /**
   * Checks if two objects are not equal
   * @param {*} value - Value to check
   * @param {*} filterValue - Object to compare against
   * @returns {boolean} True if objects are not equal
   * @throws {Error} If either value is not a plain object
   */
  static handleNotEquals(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    const result = !ObjectOperators.handleEquals(value, filterValue);

    return result;
  }

  /**
   * Checks if two objects are not identical
   * @param {*} value - Value to check
   * @param {*} filterValue - Object to compare against
   * @returns {boolean} True if objects are not identical
   * @throws {Error} If either value is not a plain object
   */
  static handleNotIdentical(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    const result = !ObjectOperators.handleEquals(value, filterValue);

    return result;
  }

  /**
   * Checks if object has a specific number of properties
   * @param {*} value - Object to check
   * @param {*} filterValue - Number of properties expected
   * @returns {boolean} True if object has the specified number of properties
   * @throws {Error} If value is not a plain object or filterValue is not a number
   */
  static handlePropertyCount(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type): boolean {
    if (!ObjectOperators.isPlainObjectValue(value)) {
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
  static handleSimilarity(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }): boolean {
    if (!ObjectOperators.isPlainObjectValue(value)) {
      throw new FilterOperatorError(`OBJECT.SIMILARITY requires value to be a plain object, got ${typeof value}`, { 'operator': 'OBJECT.SIMILARITY' });
    }
    if (!ObjectOperators.isPlainObjectValue(filterValue)) {
      throw new FilterOperatorError(`OBJECT.SIMILARITY requires filter value to be a plain object, got ${typeof filterValue}`, { 'operator': 'OBJECT.SIMILARITY' });
    }

    const threshold = options?.condition?.threshold ?? ObjectOperators.DEFAULT_SIMILARITY_THRESHOLD;

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
      // Both empty objects are 100% similar
      return true;
    }

    let matches = 0;

    for (const key of allKeys) {
      if (Object.hasOwn(value, key)
          && Object.hasOwn(filterValue, key)
          && ObjectOperators.deepEqual(value[key], filterValue[key])) {
        matches++;
      }
    }

    const similarity = matches / allKeys.size;
    const result = similarity >= threshold;

    return result;
  }
}
