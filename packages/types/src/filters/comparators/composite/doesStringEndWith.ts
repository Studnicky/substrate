/**
 * Checks if a string ends with a suffix with case sensitivity support
 */

import type {
  FilterConditionInterface
} from '../../interfaces.js';

import { Guard } from '../../../guards/Guard.js';
import { AreStringsMatching } from '../atomic/areStringsMatching.js';

export class DoesStringEndWith {
  static doesStringEndWith(value: unknown, filterValue: unknown, condition: FilterConditionInterface = {}): boolean {
    if (!Guard.isString(value) || !Guard.isString(filterValue)) {
      return false;
    }

    const result = AreStringsMatching.areStringsMatching(value, filterValue, condition, (firstValue, secondValue) => {
      const matches = firstValue.endsWith(secondValue);
      return matches;
    });

    return result;
  }
}
