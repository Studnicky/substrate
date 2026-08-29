/**
 * Checks if a numeric value is not close to another within a specified precision
 */

import { Predicates } from '@studnicky/types';

import type { FilterValueEntity } from '../../FilterValueEntity.js';

export class IsNotCloseTo {
  static isNotCloseTo(value: unknown, expected: FilterValueEntity.Type, precision = 2): boolean {
    const result = !Predicates.isCloseTo(value, expected, precision);
    return result;
  }
}
