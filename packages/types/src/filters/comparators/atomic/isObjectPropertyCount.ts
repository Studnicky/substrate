/**
 * Checks if an object has exactly the specified number of properties
 */

import type { FilterValue } from '../../types.js';

export function isObjectPropertyCount(obj: FilterValue, expectedCount: FilterValue): boolean {
  if (typeof obj !== 'object' || obj === null || typeof expectedCount !== 'number') {
    return false;
  }

  return Object.keys(obj).length === expectedCount;
}
