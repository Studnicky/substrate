import type { FilterValue } from '../../types.js';

import { Guard } from '../../../guards/Guard.js';

export function isRangeValid(range: FilterValue): range is FilterValue[] {
  const result = Guard.isArray(range) && range.length === 2;
  return result;
}
