/**
 * Checks if a string starts with a prefix with case sensitivity support
 */

import { Predicates } from '@studnicky/types';

import type {
  FilterConditionInterface
} from '../../interfaces.js';

export class DoesStringStartWith {
  static doesStringStartWith(value: unknown, filterValue: unknown, condition: FilterConditionInterface = {}): boolean {
    if (!Predicates.isString(value) || !Predicates.isString(filterValue)) {
      return false;
    }

    const result = Predicates.areStringsMatching(value, filterValue, condition, (firstValue, secondValue) => {
      const matches = firstValue.startsWith(secondValue);
      return matches;
    });

    return result;
  }
}
