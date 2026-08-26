/**
 * Checks if a numeric value falls within a specified range (inclusive)
 *
 * Determines whether a value is greater than or equal to the minimum value
 * and less than or equal to the maximum value in a range. The range should
 * be provided as a two-element array [min, max].
 *
 * @example
 * IsInRange.isInRange(5, [1, 10]); // true
 * IsInRange.isInRange(0, [1, 10]); // false
 * IsInRange.isInRange(10, [1, 10]); // true (inclusive)
 * IsInRange.isInRange(15, [1, 10]); // false
 */

import type { FilterValueEntity } from '../../FilterValueEntity.js';

import { IsRangeValid } from '../atomic/isRangeValid.js';
import { PerformRangeComparison } from '../atomic/performRangeComparison.js';

export class IsInRange {
  static isInRange(value: unknown, range: FilterValueEntity.Type): boolean {
    if (!IsRangeValid.isRangeValid(range)) {
      return false;
    }

    const [
      minimum,
      maximum
    ] = range;

    const result = PerformRangeComparison.performRangeComparison(value, minimum, maximum, true);
    return result;
  }
}
