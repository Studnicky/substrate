/**
 * Checks if a string contains a specified substring with configurable case sensitivity
 *
 * Tests whether the main string contains the search substring anywhere within it.
 * The comparison behavior can be configured through the FilterCondition parameter
 * to be case-sensitive or case-insensitive.
 *
 * @param value - The main string to search within
 * @param filterValue - The substring to search for
 * @param condition - FilterCondition containing comparison settings (e.g., case sensitivity)
 * @returns true if the main string contains the substring, false otherwise
 *
 * @example
 * // Case-sensitive search
 * doesStringContain('Hello World', 'World', { caseSensitive: true }); // true
 * doesStringContain('Hello World', 'world', { caseSensitive: true }); // false
 *
 * // Case-insensitive search
 * doesStringContain('Hello World', 'world', { caseSensitive: false }); // true
 * doesStringContain('JavaScript', 'script', { caseSensitive: false }); // true
 */

import type {
  FilterCondition
} from '../../types.js';

import { Guard } from '../../../guards/Guard.js';
import { areStringsMatching } from '../atomic/areStringsMatching.js';

export function doesStringContain(value: unknown, filterValue: unknown, condition: FilterCondition = {}) : boolean {
  if (!Guard.isString(value) || !Guard.isString(filterValue)) {
    return false;
  }

  return areStringsMatching(value, filterValue, condition, (str1, str2) => {return str1.includes(str2);});
}
