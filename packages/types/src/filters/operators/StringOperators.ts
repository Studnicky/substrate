import type { FilterValueEntity } from '../FilterValueEntity.js';
import type { FilterConditionInterface } from '../interfaces.js';

/**
 * @module StringOperators
 * @description String operation implementations for FilterEngine
 */
import { Predicates } from '../../predicates/Predicates.js';
import { DoesStringContain } from '../comparators/composite/doesStringContain.js';
import { DoesStringEndWith } from '../comparators/composite/doesStringEndWith.js';
import { DoesStringStartWith } from '../comparators/composite/doesStringStartWith.js';
import { DoesValueMatchPattern } from '../comparators/composite/doesValueMatchPattern.js';
import { WHITESPACE_PATTERN } from '../enums/constants/WhitespacePattern.js';

/**
 * String operation implementations
 */
export class StringOperators {
  /**
   * Checks if a string contains a substring
   * @param {*} value - Value to check
   * @param {*} filterValue - Substring to find
   * @param {Object} condition - Compiled condition
   * @returns {boolean} True if value contains substring
   */
  static handleContains(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }) {
    if (typeof value !== 'string' || typeof filterValue !== 'string') {
      return false;
    }

    const result = DoesStringContain.doesStringContain(value, filterValue, options?.condition);

    return result;
  }

  /**
   * Checks if a string is empty
   * @param {*} value - Value to check (should be a string)
   * @returns {boolean} True if string is empty
   */
  static handleEmpty(value: FilterValueEntity.Type) {
    if (typeof value !== 'string') {
      return false;
    }

    const result = value.length === 0;

    return result;
  }

  /**
   * Checks if a string ends with a suffix
   * @param {*} value - Value to check
   * @param {*} filterValue - Suffix to match
   * @param {Object} condition - Compiled condition
   * @returns {boolean} True if value ends with suffix
   */
  static handleEndsWith(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }) {
    if (typeof value !== 'string' || typeof filterValue !== 'string') {
      return false;
    }

    const result = DoesStringEndWith.doesStringEndWith(value, filterValue, options?.condition);

    return result;
  }

  /**
   * Checks if two strings are equal (strict string-only comparison)
   * @param {*} value - Value to check
   * @param {*} filterValue - String to compare against
   * @returns {boolean} True if strings are exactly equal
   * @throws {Error} If either value is not a string
   */
  static handleEquals(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type) {
    if (typeof value !== 'string') {
      throw new Error(`STRING.EQUALS requires value to be a string, got ${typeof value}`);
    }
    if (typeof filterValue !== 'string') {
      throw new Error(`STRING.EQUALS requires filter value to be a string, got ${typeof filterValue}`);
    }

    const result = value === filterValue;

    return result;
  }


  /**
   * Checks if a string excludes (does not contain) a substring
   * @param {*} value - Value to check
   * @param {*} filterValue - Substring to check absence of
   * @param {Object} condition - Compiled condition
   * @returns {boolean} True if value does not contain substring
   */
  static handleExcludes(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }) {
    const contains = DoesStringContain.doesStringContain(value, filterValue, options?.condition);
    const result = !contains;

    return result;
  }

  /**
   * Checks if two strings are identical (same as equals for strings)
   * @param {*} value - Value to check
   * @param {*} filterValue - String to compare against
   * @returns {boolean} True if strings are identical
   * @throws {Error} If either value is not a string
   */
  static handleIdentical(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type) {
    if (typeof value !== 'string') {
      throw new Error(`STRING.IDENTICAL requires value to be a string, got ${typeof value}`);
    }
    if (typeof filterValue !== 'string') {
      throw new Error(`STRING.IDENTICAL requires filter value to be a string, got ${typeof filterValue}`);
    }

    const result = value === filterValue;

    return result;
  }

  /**
   * Checks the length of a string
   * @param {*} value - Value to check (should be a string)
   * @param {*} filterValue - Length to compare against
   * @returns {boolean} True if string length matches
   */
  static handleLength(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type) {
    if (typeof value !== 'string') {
      return false;
    }
    if (typeof filterValue !== 'number') {
      return false;
    }

    const result = value.length === filterValue;

    return result;
  }

  /**
   * Checks if a string exactly matches another string
   * @param {*} value - Value to check
   * @param {*} filterValue - String to match against
   * @param {Object} condition - Compiled condition
   * @returns {boolean} True if strings match exactly
   */
  static handleMatches(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }) {
    // Strict type checking - only strings can match
    if (typeof value !== 'string' || typeof filterValue !== 'string') {
      return false;
    }

    if (options?.condition?.caseSensitive !== true) {
      const result = value.toLowerCase() === filterValue.toLowerCase();

      return result;
    }

    const result = value === filterValue;

    return result;
  }

  /**
   * Checks if a string is not empty
   * @param {*} value - Value to check (should be a string)
   * @returns {boolean} True if string is not empty
   */
  static handleNotEmpty(value: FilterValueEntity.Type) {
    if (typeof value !== 'string') {
      return false;
    }

    const result = value.length > 0;

    return result;
  }

  /**
   * Checks if two strings are not equal (strict string-only comparison)
   * @param {*} value - Value to check
   * @param {*} filterValue - String to compare against
   * @returns {boolean} True if strings are not equal
   * @throws {Error} If either value is not a string
   */
  static handleNotEquals(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type) {
    if (typeof value !== 'string') {
      throw new Error(`STRING.NOT_EQUALS requires value to be a string, got ${typeof value}`);
    }
    if (typeof filterValue !== 'string') {
      throw new Error(`STRING.NOT_EQUALS requires filter value to be a string, got ${typeof filterValue}`);
    }

    const result = value !== filterValue;

    return result;
  }

  /**
   * Checks if two strings are not identical
   * @param {*} value - Value to check
   * @param {*} filterValue - String to compare against
   * @returns {boolean} True if strings are not identical
   * @throws {Error} If either value is not a string
   */
  static handleNotIdentical(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type) {
    if (typeof value !== 'string') {
      throw new Error(`STRING.NOT_IDENTICAL requires value to be a string, got ${typeof value}`);
    }
    if (typeof filterValue !== 'string') {
      throw new Error(`STRING.NOT_IDENTICAL requires filter value to be a string, got ${typeof filterValue}`);
    }

    const result = value !== filterValue;

    return result;
  }

  /**
   * Checks if a string matches a regular expression
   * @param {*} value - Value to check
   * @param {*} filterValue - Regex pattern
   * @param {Object} condition - Compiled condition with regex
   * @returns {boolean} True if pattern matches
   */
  static handleRegex(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }) {
    if (options?.condition?.regexError === true) {
      return false;
    }

    const pattern = StringOperators.resolveRegexPattern(options?.condition, filterValue);
    const result = DoesValueMatchPattern.doesValueMatchPattern(value, pattern);

    return result;
  }

  /**
   * Checks if a string starts with a prefix
   * @param {*} value - Value to check
   * @param {*} filterValue - Prefix to match
   * @param {Object} condition - Compiled condition
   * @returns {boolean} True if value starts with prefix
   */
  static handleStartsWith(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type, options?: { 'condition'?: FilterConditionInterface; 'data'?: FilterValueEntity.Type }) {
    if (typeof value !== 'string' || typeof filterValue !== 'string') {
      return false;
    }

    const result = DoesStringStartWith.doesStringStartWith(value, filterValue, options?.condition);

    return result;
  }

  /**
   * Checks if a string has a specific word count
   * @param {*} value - Value to check
   * @param {*} filterValue - Number of words expected
   * @returns {boolean} True if word count matches
   * @throws {Error} If value is not a string or filterValue is not a number
   */
  static handleWordCount(value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type) {
    if (typeof value !== 'string') {
      throw new Error(`STRING.WORD_COUNT requires value to be a string, got ${typeof value}`);
    }
    if (typeof filterValue !== 'number') {
      throw new Error(`STRING.WORD_COUNT requires filter value to be a number, got ${typeof filterValue}`);
    }

    // Split by whitespace and filter out empty strings
    const words = value.trim().split(WHITESPACE_PATTERN)
      .filter((word) => {
        const isNonEmpty = word.length > 0;

        return isNonEmpty;
      });

    const result = words.length === filterValue;

    return result;
  }

  /**
   * Resolves the pattern to test a value against for STRING.REGEX
   */
  private static resolveRegexPattern(condition: FilterConditionInterface | undefined, filterValue: FilterValueEntity.Type): string | RegExp {
    const compiledRegex = condition?.compiledRegex;

    if (Predicates.isString(compiledRegex) || Predicates.isRegExp(compiledRegex)) {
      return compiledRegex;
    }
    if (Predicates.isString(filterValue) || Predicates.isRegExp(filterValue)) {
      return filterValue;
    }

    const result = String(filterValue);

    return result;
  }
}
