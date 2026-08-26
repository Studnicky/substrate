/**
 * Checks if a numeric value falls outside a specified range (exclusive)
 *
 * Determines whether a value is less than the minimum value or greater than
 * the maximum value in a range. This is the inverse of isInRange - a value
 * is outside the range if it's either too small or too large.
 *
 * @example
 * IsOutsideRange.isOutsideRange(0, [1, 10]); // true (too small)
 * IsOutsideRange.isOutsideRange(15, [1, 10]); // true (too large)
 * IsOutsideRange.isOutsideRange(5, [1, 10]); // false (within range)
 * IsOutsideRange.isOutsideRange(1, [1, 10]); // false (on boundary)
 * IsOutsideRange.isOutsideRange(10, [1, 10]); // false (on boundary)
 */

import type { FilterValueEntity } from '../../FilterValueEntity.js';

import { IsInRange } from './isInRange.js';

export class IsOutsideRange {
  static isOutsideRange(value: unknown, range: FilterValueEntity.Type): boolean {
    const result = !IsInRange.isInRange(value, range);
    return result;
  }
}
