import type { FilterValue } from '../../types.js';

import { Guard } from '../../../guards/Guard.js';

export class IsMap {
  static isMap(value: unknown): value is Map<string, FilterValue>   {
    const result = Guard.isMap(value);
    return result;
  }
}
