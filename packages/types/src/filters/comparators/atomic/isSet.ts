import type { FilterValue } from '../../types.js';

import { Guard } from '../../../guards/Guard.js';

export function isSet(value: unknown): value is Set<FilterValue> {
  const result = Guard.isSet(value);
  return result;
}
