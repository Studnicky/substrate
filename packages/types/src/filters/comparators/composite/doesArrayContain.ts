/**
 * Checks if an array contains a specific value using deep equality comparison
 *
 * Searches through an array to find if any element is deeply equal to the search value.
 * Unlike Array.includes() which uses strict equality (===), this function performs
 * deep comparison which can match complex objects and nested structures.
 *
 * @param array - The array to search through
 * @param searchValue - The value to search for in the array
 * @returns true if the array contains an element deeply equal to searchValue, false otherwise
 *
 * @example
 * const users = [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }];
 * doesArrayContain(users, { id: 1, name: 'John' }); // true
 * doesArrayContain([1, [2, 3], 4], [2, 3]); // true
 * doesArrayContain(['a', 'b', 'c'], 'b'); // true
 * doesArrayContain([1, 2, 3], 4); // false
 */

import type { FilterValue } from '../../types.js';

import { areDeeplyEqual } from './deepEquals.js';

export function doesArrayContain(array: FilterValue, searchValue: FilterValue): boolean {
  if (!Array.isArray(array)) {
    return false;
  }

  return array.some((item) => {return areDeeplyEqual(item, searchValue, { 'caseSensitive': true });});
}
