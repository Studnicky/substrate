/**
 * Checks if an array is a subset of another array (all items are contained)
 */

import type { FilterValue } from '../../types.js';

import { doesArrayContain } from './doesArrayContain.js';

export function isArraySubset(subset: FilterValue, superset: FilterValue): boolean {
  if (!Array.isArray(subset) || !Array.isArray(superset)) {
    return false;
  }

  return subset.every((item) => {return doesArrayContain(superset, item);});
}
