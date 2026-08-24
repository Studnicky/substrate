import type { FilterValue } from '../../types.js';

import { Guard } from '../../../guards/Guard.js';

export function isArray(value: unknown): value is FilterValue[] {
  const result = Guard.isArray(value);
  return result;
}
