/**
 * Compares two strings with optional case sensitivity
 */

import type {
  FilterCondition
} from '../../types.js';

import { Guard } from '../../../guards/Guard.js';
import { areStringsEqual } from './areStringsEqual.js';

export function areStringsEqualCaseAware(
  value: unknown,
  filterValue: unknown,
  condition: FilterCondition
): boolean {
  if (!Guard.isString(value) || !Guard.isString(filterValue)) {
    return false;
  }

  return areStringsEqual(value, filterValue, condition);
}
