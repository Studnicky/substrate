/**
 * Checks if a string starts with a prefix with case sensitivity support
 */

import type {
  FilterConditionInterface
} from '../../interfaces.js';

import { Predicates } from '../../../predicates/Predicates.js';

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
