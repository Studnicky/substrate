/**
 * Checks if a value can be serialized to JSON without actually serializing it
 * This is a fast check that avoids the performance overhead of JSON.stringify
 */


import { isArray } from '../atomic/isArray.js';
import { isDate } from '../atomic/isDate.js';
import { isFunction } from '../atomic/isFunction.js';
import { isMap } from '../atomic/isMap.js';
import { isNull } from '../atomic/isNull.js';
import { isRegExp } from '../atomic/isRegExp.js';
import { isSet } from '../atomic/isSet.js';
import { isSymbol } from '../atomic/isSymbol.js';
import { isTypeOf } from '../atomic/isTypeOf.js';
import { isUndefined } from '../atomic/isUndefined.js';

/**
 * Internal recursive helper for serializability checking
 */
function isSerializableRecursive(value: unknown, visited: WeakSet<object>): boolean {
  // Primitives are always serializable
  if (isNull(value) || !isTypeOf(value, 'object')) {
    return !isFunction(value) && !isSymbol(value) && !isUndefined(value);
  }

  // Avoid infinite recursion on circular references
  if (visited.has(value as object)) {
    // Circular references are not JSON serializable
    return false;
  }
  visited.add(value as object);

  // Arrays
  if (isArray(value)) {
    return value.every((item) => {return isSerializableRecursive(item, visited);});
  }

  // Dates are serializable
  if (isDate(value)) {
    return !isNaN(value.getTime());
  }

  // RegExp, Map, Set, and other objects are not directly JSON serializable
  if (isRegExp(value) || isMap(value) || isSet(value)) {
    return false;
  }

  // Plain objects
  const objValue = value as Record<string, unknown>;

  if (objValue.constructor === Object || objValue.constructor === undefined) {
    for (const key in objValue) {
      if (objValue.hasOwnProperty(key)) {
        if (!isSerializableRecursive(objValue[key], visited)) {
          return false;
        }
      }
    }

    return true;
  }

  // Objects with toJSON method are potentially serializable
  const valueWithToJSON = value as { 'toJSON'?: () => unknown };

  if (isFunction(valueWithToJSON.toJSON)) {
    try {
      const jsonValue = valueWithToJSON.toJSON!();

      return isSerializableRecursive(jsonValue, visited);
    } catch {
      return false;
    }
  }

  // Other object types are generally not serializable
  return false;
}

/**
 * Checks if a value can be serialized to JSON without actually serializing it
 * @param value - The value to check for serializability
 * @returns true if the value can be JSON serialized, false otherwise
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
export function isSerializable(value: unknown): boolean {
  return isSerializableRecursive(value, new WeakSet());
}
