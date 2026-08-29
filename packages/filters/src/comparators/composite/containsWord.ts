/**
 * Checks if a string contains a specific word with word boundary matching
 *
 * Searches for a complete word within a string using word boundaries (\b) to ensure
 * the search term is found as a whole word and not as part of a larger word.
 * The search is case-insensitive and handles special regex characters safely.
 *
 * @example
 * ContainsWord.containsWord('Hello world', 'world'); // true
 * ContainsWord.containsWord('Hello world', 'Hello'); // true
 * ContainsWord.containsWord('JavaScript is great', 'Script'); // false (part of 'JavaScript')
 * ContainsWord.containsWord('JavaScript is great', 'is'); // true
 * ContainsWord.containsWord('test-case', 'test'); // true (word boundary at hyphen)
 * ContainsWord.containsWord('testing', 'test'); // false (part of larger word)
 */

import { Predicates } from '@studnicky/types';

import { ESCAPE_REGEX_CHARACTERS_PATTERN } from './constants/EscapeRegexCharactersPattern.js';

export class ContainsWord {
  static containsWord(value: unknown, word: string): boolean {
    if (!Predicates.isString(value)) {
      return false;
    }

    // Escape special regex characters in the word
    const escapedWord = word.replace(ESCAPE_REGEX_CHARACTERS_PATTERN, '\\$&');
    // Create regex with word boundaries
    // nosemgrep: javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp -- escapedWord has every regex metacharacter escaped above, so no quantifier can reach the pattern
    const wordBoundaryPattern = new RegExp(`\\b${escapedWord}\\b`, 'i');

    const result = wordBoundaryPattern.test(value);
    return result;
  }
}
