/**
 * Checks if an array contains all values from another array
 */

import type { FilterValueEntity } from '../../FilterValueEntity.js';

import { DoesArrayContain } from './doesArrayContain.js';

export class DoesArrayContainAll {
  static doesArrayContainAll(array: FilterValueEntity.Type, searchValues: FilterValueEntity.Type): boolean {
    if (!Array.isArray(array) || !Array.isArray(searchValues)) {
      return false;
    }

    const result = searchValues.every((searchValue) => {
      const isContained = DoesArrayContain.doesArrayContain(array, searchValue);
      return isContained;
    });

    return result;
  }
}
