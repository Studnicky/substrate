/**
 * Checks if an array contains all values from another array
 */

import type { FilterValue } from '../../types.js';

import { doesArrayContain } from './doesArrayContain.js';

export function doesArrayContainAll(array: FilterValue, searchValues: FilterValue): boolean {
  if (!Array.isArray(array) || !Array.isArray(searchValues)) {
    return false;
  }

  return searchValues.every((searchValue) => {return doesArrayContain(array, searchValue);});
}
