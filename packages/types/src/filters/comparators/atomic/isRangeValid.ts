import type { FilterValueEntity } from '../../FilterValueEntity.js';

import { Guard } from '../../../guards/Guard.js';

export class IsRangeValid {
  static isRangeValid(range: unknown): range is FilterValueEntity.Type[]   {
    const result = Guard.isArray(range) && range.length === 2;
    return result;
  }
}
