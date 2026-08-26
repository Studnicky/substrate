import type { FilterValueEntity } from '../../FilterValueEntity.js';

import { Guard } from '../../../guards/Guard.js';

export class IsMap {
  static isMap(value: unknown): value is Map<string, FilterValueEntity.Type>   {
    const result = Guard.isMap(value);
    return result;
  }
}
