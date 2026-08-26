/**
 * Checks if an array contains a specific value using deep equality comparison
 *
 * Searches through an array to find if any element is deeply equal to the search value.
 * Unlike Array.includes() which uses strict equality (===), this function performs
 * deep comparison which can match complex objects and nested structures.
 *
 * @example
 * const users = [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }];
 * DoesArrayContain.doesArrayContain(users, { id: 1, name: 'John' }); // true
 * DoesArrayContain.doesArrayContain([1, [2, 3], 4], [2, 3]); // true
 * DoesArrayContain.doesArrayContain(['a', 'b', 'c'], 'b'); // true
 * DoesArrayContain.doesArrayContain([1, 2, 3], 4); // false
 */

import type { FilterValueEntity } from '../../FilterValueEntity.js';

import { AreDeeplyEqual } from './areDeeplyEqual.js';

export class DoesArrayContain {
  static doesArrayContain(array: FilterValueEntity.Type, searchValue: FilterValueEntity.Type): boolean {
    if (!Array.isArray(array)) {
      return false;
    }

    const result = array.some((item) => {
      const isMatch = AreDeeplyEqual.areDeeplyEqual(item, searchValue, { 'caseSensitive': true });
      return isMatch;
    });

    return result;
  }
}
