/**
 * Checks if two strings are equal with configurable case sensitivity
 *
 * Compares two strings for exact equality, with the ability to perform
 * case-sensitive or case-insensitive comparison based on the FilterCondition.
 * This is a wrapper around the more general string matching functionality.
 *
 * @param value - The first string to compare
 * @param filterValue - The second string to compare
 * @param condition - FilterCondition containing comparison settings (e.g., case sensitivity)
 * @returns true if the strings are equal (according to the case sensitivity setting), false otherwise
 *
 * @example
 * // Case-sensitive comparison
 * areStringsEqual('Hello', 'Hello', { caseSensitive: true }); // true
 * areStringsEqual('Hello', 'hello', { caseSensitive: true }); // false
 *
 * // Case-insensitive comparison
 * areStringsEqual('Hello', 'hello', { caseSensitive: false }); // true
 * areStringsEqual('JavaScript', 'JAVASCRIPT', { caseSensitive: false }); // true
 */

import type { FilterCondition } from '../../types.js';

import { areStringsMatching } from '../atomic/areStringsMatching.js';

export function areStringsEqual(value: string, filterValue: string, condition: FilterCondition = {}) : boolean {
  return areStringsMatching(value, filterValue, condition, (str1, str2) => {return str1 === str2;});
}
