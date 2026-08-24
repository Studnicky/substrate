import type { FilterValue } from '../../types.js';

import { Guard } from '../../../guards/Guard.js';

export function isMap(value: unknown): value is Map<string, FilterValue> {
  const result = Guard.isMap(value);
  return result;
}
