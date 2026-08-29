/**
 * Checks if a string ends with a suffix with case sensitivity support
 */

import { Predicates } from '@studnicky/types';

import type {
  FilterConditionInterface
} from '../../interfaces.js';

export class DoesStringEndWith {
  static doesStringEndWith(value: unknown, filterValue: unknown, condition: FilterConditionInterface = {}): boolean {
    if (!Predicates.isString(value) || !Predicates.isString(filterValue)) {
      return false;
    }

    const result = Predicates.areStringsMatching(value, filterValue, condition, (firstValue, secondValue) => {
      const matches = firstValue.endsWith(secondValue);
      return matches;
    });

    return result;
  }
}
