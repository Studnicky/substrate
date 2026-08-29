/**
 * Checks if a string contains a specified substring with configurable case sensitivity
 *
 * Tests whether the main string contains the search substring anywhere within it.
 * The comparison behavior can be configured through the FilterConditionInterface parameter
 * to be case-sensitive or case-insensitive.
 *
 * @example
 * // Case-sensitive search
 * DoesStringContain.doesStringContain('Hello World', 'World', { caseSensitive: true }); // true
 * DoesStringContain.doesStringContain('Hello World', 'world', { caseSensitive: true }); // false
 *
 * // Case-insensitive search
 * DoesStringContain.doesStringContain('Hello World', 'world', { caseSensitive: false }); // true
 * DoesStringContain.doesStringContain('JavaScript', 'script', { caseSensitive: false }); // true
 */

import { Predicates } from '@studnicky/types';

import type {
  FilterConditionInterface
} from '../../interfaces.js';

export class DoesStringContain {
  static doesStringContain(value: unknown, filterValue: unknown, condition: FilterConditionInterface = {}): boolean {
    if (!Predicates.isString(value) || !Predicates.isString(filterValue)) {
      return false;
    }

    const result = Predicates.areStringsMatching(value, filterValue, condition, (firstValue, secondValue) => {
      const matches = firstValue.includes(secondValue);
      return matches;
    });

    return result;
  }
}
