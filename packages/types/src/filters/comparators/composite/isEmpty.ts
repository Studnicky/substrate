/**
 * Universal emptiness checker for all JavaScript data types
 *
 * Determines if a value should be considered "empty" based on its type and content.
 * This function provides a consistent way to check emptiness across different data
 * types, which is useful for validation and filtering operations.
 *
 * Empty values include:
 * - null and undefined
 * - Empty strings ('')
 * - Empty arrays ([])
 * - Empty TypedArrays (Uint8Array(0), Int32Array(0), etc.)
 * - Empty RegExp patterns (new RegExp(''))
 * - Empty objects ({})
 * - Empty Sets and Maps
 *
 * @param value - The value to test for emptiness
 * @returns true if the value is considered empty, false otherwise
 *
 * @example
 * isEmpty(null); // true
 * isEmpty(undefined); // true
 * isEmpty(''); // true
 * isEmpty([]); // true
 * isEmpty(new Uint8Array(0)); // true
 * isEmpty(new RegExp('')); // true
 * isEmpty({}); // true
 * isEmpty(new Set()); // true
 * isEmpty(new Map()); // true
 * isEmpty('hello'); // false
 * isEmpty([1, 2, 3]); // false
 * isEmpty({ name: 'John' }); // false
 */


import { isEmptyArray } from '../atomic/isEmptyArray.js';
import { isEmptyRegExp } from '../atomic/isEmptyRegExp.js';
import { isEmptyString } from '../atomic/isEmptyString.js';
import { isEmptyTypedArray } from '../atomic/isEmptyTypedArray.js';
import { isNullOrUndefined } from '../atomic/isNullOrUndefined.js';
import { isEmptyObject } from './isEmptyObject.js';

export function isEmpty(value: unknown): boolean {
  // null and undefined are empty
  if (isNullOrUndefined(value)) {
    return true;
  }

  // Empty string
  if (isEmptyString(value)) {
    return true;
  }

  // Empty array
  if (isEmptyArray(value)) {
    return true;
  }

  // Empty TypedArray
  if (isEmptyTypedArray(value)) {
    return true;
  }

  // Empty RegExp
  if (isEmptyRegExp(value)) {
    return true;
  }

  // Empty object (Set, Map, or plain object with no enumerable properties)
  if (isEmptyObject(value)) {
    return true;
  }

  // Everything else is not considered empty
  return false;
}
