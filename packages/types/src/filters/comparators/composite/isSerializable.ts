/**
 * Checks if a value can be serialized to JSON without actually serializing it
 * This is a fast check that avoids the performance overhead of JSON.stringify
 *
 * JSON serializable values include:
 * - Primitives: string, number, boolean, null
 * - Arrays of serializable values
 * - Plain objects with serializable properties
 * - Valid Date objects
 * - Objects with a toJSON method that returns serializable data
 *
 * Non-serializable values include:
 * - undefined
 * - Functions
 * - Symbols
 * - RegExp, Map, Set, WeakMap, WeakSet
 * - Objects with circular references
 * - Invalid Date objects (NaN)
 */

import { Predicates } from '../../../predicates/Predicates.js';

export class IsSerializable {
  static isSerializable(value: unknown): boolean {
    const result = IsSerializable.isSerializableRecursive(value, new WeakSet());
    return result;
  }

  /**
   * Internal recursive helper for serializability checking
   */
  private static isSerializableRecursive(value: unknown, visited: WeakSet<object>): boolean {
    // Primitives are always serializable
    if (Predicates.isNull(value) || !Predicates.isTypeOf(value, 'object')) {
      const result = !Predicates.isFunction(value) && !Predicates.isSymbol(value) && !Predicates.isUndefined(value);
      return result;
    }

    // Avoid infinite recursion on circular references
    if (visited.has(value as object)) {
      // Circular references are not JSON serializable
      return false;
    }
    visited.add(value as object);

    // Arrays
    if (Predicates.isArray(value)) {
      const result = value.every((item) => {
        const itemResult = IsSerializable.isSerializableRecursive(item, visited);
        return itemResult;
      });

      return result;
    }

    // Dates are serializable
    if (Predicates.isDate(value)) {
      const result = !isNaN(value.getTime());
      return result;
    }

    // RegExp, Map, Set, and other objects are not directly JSON serializable
    if (Predicates.isRegExp(value) || Predicates.isMap(value) || Predicates.isSet(value)) {
      return false;
    }

    // Plain objects
    const objectValue = value as Record<string, unknown>;

    if (objectValue.constructor === Object || objectValue.constructor === undefined) {
      const propertyKeys = Object.keys(objectValue);
      const propertyKeysLength = propertyKeys.length;

      for (let index = 0; index < propertyKeysLength; index++) {
        const key = propertyKeys[index];

        if (key !== undefined && !IsSerializable.isSerializableRecursive(objectValue[key], visited)) {
          return false;
        }
      }

      return true;
    }

    // Objects with toJSON method are potentially serializable
    const valueWithToJSON = value as { 'toJSON'?: () => unknown };

    if (Predicates.isFunction(valueWithToJSON.toJSON)) {
      try {
        const jsonValue = valueWithToJSON.toJSON();
        const result = IsSerializable.isSerializableRecursive(jsonValue, visited);

        return result;
      } catch {
        return false;
      }
    }

    // Other object types are generally not serializable
    return false;
  }
}
