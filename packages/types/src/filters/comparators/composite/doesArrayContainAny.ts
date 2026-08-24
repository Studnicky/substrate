/**
 * Checks if an array contains any values from another array
 */

import type { FilterValue } from '../../types.js';

import { doesArrayContain } from './doesArrayContain.js';

export function doesArrayContainAny(array: FilterValue, searchValues: FilterValue): boolean {
  if (!Array.isArray(array) || !Array.isArray(searchValues)) {
    return false;
  }

  return searchValues.some((searchValue) => {return doesArrayContain(array, searchValue);});
}
