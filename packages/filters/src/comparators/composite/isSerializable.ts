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

import {
  JsonValue,
  Predicates
} from '@studnicky/types';

export class IsSerializable {
  static isSerializable(value: object | string | number | boolean | bigint | symbol | null | undefined): boolean {
    const result = IsSerializable.isSerializableRecursive(value, new WeakSet());
    return result;
  }

  /**
   * Internal recursive helper for serializability checking
   */
  private static isSerializableRecursive(value: object | string | number | boolean | bigint | symbol | null | undefined, visited: WeakSet<object>): boolean {
    // Primitives are always serializable
    if (!Predicates.isObjectLike(value)) {
      const result = !Predicates.isFunction(value) && !Predicates.isSymbol(value) && !Predicates.isUndefined(value);
      return result;
    }

    // Avoid infinite recursion on circular references
    if (visited.has(value)) {
      // Circular references are not JSON serializable
      return false;
    }
    visited.add(value);

    // Arrays
    if (Predicates.isArray(value)) {
      const result = value.every((item) => {
        if (!JsonValue.is(item) && !Predicates.isObjectLike(item)) {
          return false;
        }
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

    if (!Predicates.isRecord(value)) {
      return false;
    }

    // Plain objects
    if (value.constructor === Object || value.constructor === undefined) {
      const propertyKeys = Object.keys(value);
      const propertyKeysLength = propertyKeys.length;

      for (let index = 0; index < propertyKeysLength; index++) {
        const key = propertyKeys[index];

        if (key === undefined) {
          continue;
        }
        const propertyValue = value[key];

        if ((!JsonValue.is(propertyValue) && !Predicates.isObjectLike(propertyValue))
            || !IsSerializable.isSerializableRecursive(propertyValue, visited)) {
          return false;
        }
      }

      return true;
    }

    // Objects with toJSON method are potentially serializable
    const toJSON = value.toJSON;

    if (Predicates.isFunction(toJSON)) {
      try {
        const jsonValue = Reflect.apply(toJSON, value, []);

        if (!JsonValue.is(jsonValue) && !Predicates.isObjectLike(jsonValue)) {
          return false;
        }
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
