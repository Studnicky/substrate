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
} from '@studnicky/types/node';

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

    const containerResult = IsSerializable.dispatchContainer(value, visited);

    if (containerResult !== null) {
      return containerResult;
    }

    if (!Predicates.isRecord(value)) {
      return false;
    }

    // Plain objects
    if (value.constructor === Object || value.constructor === undefined) {
      const result = IsSerializable.isPlainObjectSerializable(value, visited);

      return result;
    }

    // Objects with toJSON method are potentially serializable
    const result = IsSerializable.isToJsonSerializable(value, visited);

    return result;
  }

  /** Arrays, Dates, and unsupported containers; `null` means `value` is a record still needing plain-object/toJSON handling. */
  private static dispatchContainer(value: object, visited: WeakSet<object>): boolean | null {
    if (Predicates.isArray(value)) {
      const result = value.every((item) => { const itemResult = IsSerializable.isSerializableItem(item, visited);
        return itemResult; });

      return result;
    }

    // Dates are serializable
    if (Predicates.isDate(value)) {
      const result = !isNaN(value.getTime());

      return result;
    }

    // RegExp, Map, Set are not directly JSON serializable
    if (IsSerializable.isUnsupportedContainer(value)) {
      return false;
    }

    return null;
  }

  /** Item is serializable when it's a JSON-shaped primitive/object-like value that passes recursive checking. */
  private static isSerializableItem(item: unknown, visited: WeakSet<object>): boolean {
    if (!JsonValue.is(item) && !Predicates.isObjectLike(item)) {
      return false;
    }

    const result = IsSerializable.isSerializableRecursive(item, visited);

    return result;
  }

  private static isUnsupportedContainer(value: unknown): boolean {
    const result = Predicates.isRegExp(value) || Predicates.isMap(value) || Predicates.isSet(value);

    return result;
  }

  private static isPlainObjectSerializable(value: Record<string, unknown>, visited: WeakSet<object>): boolean {
    const propertyKeys = Object.keys(value);
    const propertyKeysLength = propertyKeys.length;

    for (let index = 0; index < propertyKeysLength; index++) {
      const key = propertyKeys[index];

      if (key === undefined) {
        continue;
      }

      if (!IsSerializable.isSerializableItem(value[key], visited)) {
        return false;
      }
    }

    return true;
  }

  private static isToJsonSerializable(value: Record<string, unknown>, visited: WeakSet<object>): boolean {
    const toJSON = value.toJSON;

    if (!Predicates.isFunction(toJSON)) {
      // Other object types are generally not serializable
      return false;
    }

    try {
      const jsonValue: unknown = Reflect.apply(toJSON, value, []);
      const result = IsSerializable.isSerializableItem(jsonValue, visited);

      return result;
    } catch {
      return false;
    }
  }
}
