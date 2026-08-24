/**
 * Checks if a numeric value falls outside a specified range (exclusive)
 *
 * Determines whether a value is less than the minimum value or greater than
 * the maximum value in a range. This is the inverse of isInRange - a value
 * is outside the range if it's either too small or too large.
 *
 * @param value - The numeric value to test
 * @param range - A two-element array [min, max] defining the range boundaries
 * @returns true if the value is outside the range (value < min || value > max), false otherwise
 *
 * @example
 * isOutsideRange(0, [1, 10]); // true (too small)
 * isOutsideRange(15, [1, 10]); // true (too large)
 * isOutsideRange(5, [1, 10]); // false (within range)
 * isOutsideRange(1, [1, 10]); // false (on boundary)
 * isOutsideRange(10, [1, 10]); // false (on boundary)
 */

import type { FilterValue } from '../../types.js';

import { isInRange } from './isInRange.js';

export function isOutsideRange(value: unknown, range: FilterValue): boolean {
  return !isInRange(value, range);
}
