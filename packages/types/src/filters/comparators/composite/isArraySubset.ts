/**
 * Checks if an array is a subset of another array (all items are contained)
 */

import type { FilterValueEntity } from '../../FilterValueEntity.js';

import { DoesArrayContain } from './doesArrayContain.js';

export class IsArraySubset {
  static isArraySubset(subset: FilterValueEntity.Type, superset: FilterValueEntity.Type): boolean {
    if (!Array.isArray(subset) || !Array.isArray(superset)) {
      return false;
    }

    const result = subset.every((item) => {
      const isContained = DoesArrayContain.doesArrayContain(superset, item);
      return isContained;
    });

    return result;
  }
}
