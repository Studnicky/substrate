/**
 * Checks if a string contains a specific word with word boundary matching
 *
 * Searches for a complete word within a string using word boundaries (\b) to ensure
 * the search term is found as a whole word and not as part of a larger word.
 * The search is case-insensitive and handles special regex characters safely.
 *
 * @param value - The string to search within
 * @param word - The complete word to search for
 * @returns true if the string contains the word as a complete word, false otherwise
 *
 * @example
 * containsWord('Hello world', 'world'); // true
 * containsWord('Hello world', 'Hello'); // true
 * containsWord('JavaScript is great', 'Script'); // false (part of 'JavaScript')
 * containsWord('JavaScript is great', 'is'); // true
 * containsWord('test-case', 'test'); // true (word boundary at hyphen)
 * containsWord('testing', 'test'); // false (part of larger word)
 */


import { isString } from '../atomic/isString.js';

export function containsWord(value: unknown, word: string): boolean {
  if (!isString(value)) {
    return false;
  }

  // Escape special regex characters in the word
  const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Create regex with word boundaries
  const regex = new RegExp(`\\b${escapedWord}\\b`, 'i');

  return regex.test(value);
}
