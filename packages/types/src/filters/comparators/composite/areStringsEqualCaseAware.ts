/**
 * Compares two strings with optional case sensitivity
 */

import type {
  FilterConditionInterface
} from '../../interfaces.js';

import { Predicates } from '../../../predicates/Predicates.js';
import { AreStringsEqual } from './areStringsEqual.js';

export class AreStringsEqualCaseAware {
  static areStringsEqualCaseAware(
    value: unknown,
    filterValue: unknown,
    condition: FilterConditionInterface
  ): boolean {
    if (!Predicates.isString(value) || !Predicates.isString(filterValue)) {
      return false;
    }

    const result = AreStringsEqual.areStringsEqual(value, filterValue, condition);
    return result;
  }
}
