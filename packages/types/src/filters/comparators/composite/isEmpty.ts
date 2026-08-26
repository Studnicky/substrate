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
 * @example
 * IsEmpty.isEmpty(null); // true
 * IsEmpty.isEmpty(undefined); // true
 * IsEmpty.isEmpty(''); // true
 * IsEmpty.isEmpty([]); // true
 * IsEmpty.isEmpty(new Uint8Array(0)); // true
 * IsEmpty.isEmpty(new RegExp('')); // true
 * IsEmpty.isEmpty({}); // true
 * IsEmpty.isEmpty(new Set()); // true
 * IsEmpty.isEmpty(new Map()); // true
 * IsEmpty.isEmpty('hello'); // false
 * IsEmpty.isEmpty([1, 2, 3]); // false
 * IsEmpty.isEmpty({ name: 'John' }); // false
 */

import { Predicates } from '../../../predicates/Predicates.js';
import { IsEmptyObject } from './isEmptyObject.js';

export class IsEmpty {
  static isEmpty(value: unknown): boolean {
    // null and undefined are empty
    if (Predicates.isNullish(value)) {
      return true;
    }

    // Empty string
    if (Predicates.isEmptyString(value)) {
      return true;
    }

    // Empty array
    if (Predicates.isEmptyArray(value)) {
      return true;
    }

    // Empty TypedArray
    if (Predicates.isEmptyTypedArray(value)) {
      return true;
    }

    // Empty RegExp
    if (Predicates.isEmptyRegExp(value)) {
      return true;
    }

    // Empty object (Set, Map, or plain object with no enumerable properties)
    if (IsEmptyObject.isEmptyObject(value)) {
      return true;
    }

    // Everything else is not considered empty
    return false;
  }
}
