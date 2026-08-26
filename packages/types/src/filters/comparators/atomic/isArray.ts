import type { FilterValueEntity } from '../../FilterValueEntity.js';

import { Guard } from '../../../guards/Guard.js';

export class IsArray {
  static isArray(value: unknown): value is FilterValueEntity.Type[]   {
    const result = Guard.isArray(value);
    return result;
  }
}
