import type { FilterValueEntity } from '../../FilterValueEntity.js';

import { Guard } from '../../../guards/Guard.js';

export class IsSet {
  static isSet(value: unknown): value is Set<FilterValueEntity.Type>   {
    const result = Guard.isSet(value);
    return result;
  }
}
