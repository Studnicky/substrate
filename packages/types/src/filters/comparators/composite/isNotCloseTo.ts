/**
 * Checks if a numeric value is not close to another within a specified precision
 */

import type { FilterValueEntity } from '../../FilterValueEntity.js';

import { IsCloseTo } from '../atomic/isCloseTo.js';

export class IsNotCloseTo {
  static isNotCloseTo(value: unknown, expected: FilterValueEntity.Type, precision = 2): boolean {
    const result = !IsCloseTo.isCloseTo(value, expected, precision);
    return result;
  }
}
