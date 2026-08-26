/**
 * Checks if two strings are equal with configurable case sensitivity
 *
 * Compares two strings for exact equality, with the ability to perform
 * case-sensitive or case-insensitive comparison based on the FilterConditionInterface.
 * This is a wrapper around the more general string matching functionality.
 *
 * @example
 * // Case-sensitive comparison
 * AreStringsEqual.areStringsEqual('Hello', 'Hello', { caseSensitive: true }); // true
 * AreStringsEqual.areStringsEqual('Hello', 'hello', { caseSensitive: true }); // false
 *
 * // Case-insensitive comparison
 * AreStringsEqual.areStringsEqual('Hello', 'hello', { caseSensitive: false }); // true
 * AreStringsEqual.areStringsEqual('JavaScript', 'JAVASCRIPT', { caseSensitive: false }); // true
 */

import type { FilterConditionInterface } from '../../interfaces.js';

import { Predicates } from '../../../predicates/Predicates.js';

export class AreStringsEqual {
  static areStringsEqual(value: string, filterValue: string, condition: FilterConditionInterface = {}): boolean {
    const result = Predicates.areStringsMatching(value, filterValue, condition, (firstValue, secondValue) => {
      const matches = firstValue === secondValue;
      return matches;
    });

    return result;
  }
}
