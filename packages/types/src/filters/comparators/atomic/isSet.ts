import type { FilterValue } from '../../types.js';

import { Guard } from '../../../guards/Guard.js';

export class IsSet {
  static isSet(value: unknown): value is Set<FilterValue>   {
    const result = Guard.isSet(value);
    return result;
  }
}
