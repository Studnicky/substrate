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

import type {
  FilterConditionInterface
} from '../../interfaces.js';

import { Guard } from '../../../guards/Guard.js';
import { AreStringsMatching } from '../atomic/areStringsMatching.js';

export class DoesStringContain {
  static doesStringContain(value: unknown, filterValue: unknown, condition: FilterConditionInterface = {}): boolean {
    if (!Guard.isString(value) || !Guard.isString(filterValue)) {
      return false;
    }

    const result = AreStringsMatching.areStringsMatching(value, filterValue, condition, (firstValue, secondValue) => {
      const matches = firstValue.includes(secondValue);
      return matches;
    });

    return result;
  }
}
