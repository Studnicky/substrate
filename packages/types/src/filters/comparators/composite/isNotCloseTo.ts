/**
 * Checks if a numeric value is not close to another within a specified precision
 */

import type { FilterValue } from '../../types.js';

import { isCloseTo } from '../atomic/isCloseTo.js';

export function isNotCloseTo(value: unknown, expected: FilterValue, precision = 2): boolean {
  return !isCloseTo(value, expected, precision);
}
