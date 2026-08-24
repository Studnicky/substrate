/**
 * Checks if a numeric value falls within a specified range (inclusive)
 *
 * Determines whether a value is greater than or equal to the minimum value
 * and less than or equal to the maximum value in a range. The range should
 * be provided as a two-element array [min, max].
 *
 * @param value - The numeric value to test
 * @param range - A two-element array [min, max] defining the inclusive range
 * @returns true if the value is within the range (min <= value <= max), false otherwise
 *
 * @example
 * isInRange(5, [1, 10]); // true
 * isInRange(0, [1, 10]); // false
 * isInRange(10, [1, 10]); // true (inclusive)
 * isInRange(15, [1, 10]); // false
 */

import type { FilterValue } from '../../types.js';

import { isRangeValid } from '../atomic/isRangeValid.js';
import { performRangeComparison } from '../atomic/performRangeComparison.js';

export function isInRange(value: unknown, range: FilterValue): boolean {
  if (!isRangeValid(range)) {
    return false;
  }

  const [
    min,
    max
  ] = range;

  return performRangeComparison(value, min, max, true);
}

