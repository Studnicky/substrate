import type { FilterCondition, FilterValue } from '../types.js';

/**
 * @module StringOperators
 * @description String operation implementations for FilterEngine
 */
import { Guard } from '../../guards/Guard.js';
import { doesStringEndWith } from '../comparators/composite/doesStringEndWith.js';
import { doesStringStartWith } from '../comparators/composite/doesStringStartWith.js';
import { doesValueMatchPattern } from '../comparators/composite/matchesPattern.js';
import { doesStringContain } from '../comparators/composite/stringContains.js';

/**
 * String operation implementations
 */
export class StringOperators {
  /**
   * Checks if a string contains a substring
   * @param {*} value - Value to check
   * @param {*} filterValue - Substring to find
   * @param {Object} condition - Compiled condition
   * @param {Object} engine - FilterEngine instance for helper methods
   * @returns {boolean} True if value contains substring
   */
  static handleContains(value: FilterValue, filterValue: FilterValue, condition?: FilterCondition, _engine?: unknown) {
    const result = doesStringContain(value, filterValue, condition);

    return result;
  }

  /**
   * Checks if a string is empty
   * @param {*} value - Value to check (should be a string)
   * @returns {boolean} True if string is empty
   */
  static handleEmpty(value: FilterValue) {
    if (typeof value !== 'string') {
      return false;
    }

    return value.length === 0;
  }

  /**
   * Checks if a string ends with a suffix
   * @param {*} value - Value to check
   * @param {*} filterValue - Suffix to match
   * @param {Object} condition - Compiled condition
   * @param {Object} engine - FilterEngine instance for helper methods
   * @returns {boolean} True if value ends with suffix
   */
  static handleEndsWith(value: FilterValue, filterValue: FilterValue, condition?: FilterCondition, _engine?: unknown) {
    const result = doesStringEndWith(value, filterValue, condition);

    return result;
  }

  /**
   * Checks if two strings are equal (strict string-only comparison)
   * @param {*} value - Value to check
   * @param {*} filterValue - String to compare against
   * @returns {boolean} True if strings are exactly equal
   * @throws {Error} If either value is not a string
   */
  static handleEquals(value: FilterValue, filterValue: FilterValue) {
    if (typeof value !== 'string') {
      throw new Error(`STRING.EQUALS requires value to be a string, got ${typeof value}`);
    }
    if (typeof filterValue !== 'string') {
      throw new Error(`STRING.EQUALS requires filter value to be a string, got ${typeof filterValue}`);
    }

    return value === filterValue;
  }


  /**
   * Checks if a string excludes (does not contain) a substring
   * @param {*} value - Value to check
   * @param {*} filterValue - Substring to check absence of
   * @param {Object} condition - Compiled condition
   * @param {Object} engine - FilterEngine instance for helper methods
   * @returns {boolean} True if value does not contain substring
   */
  static handleExcludes(value: FilterValue, filterValue: FilterValue, condition?: FilterCondition, _engine?: unknown) {
    const contains = doesStringContain(value, filterValue, condition);

    return !contains;
  }

  /**
   * Checks if two strings are identical (same as equals for strings)
   * @param {*} value - Value to check
   * @param {*} filterValue - String to compare against
   * @returns {boolean} True if strings are identical
   * @throws {Error} If either value is not a string
   */
  static handleIdentical(value: FilterValue, filterValue: FilterValue) {
    if (typeof value !== 'string') {
      throw new Error(`STRING.IDENTICAL requires value to be a string, got ${typeof value}`);
    }
    if (typeof filterValue !== 'string') {
      throw new Error(`STRING.IDENTICAL requires filter value to be a string, got ${typeof filterValue}`);
    }

    return value === filterValue;
  }

  /**
   * Checks the length of a string
   * @param {*} value - Value to check (should be a string)
   * @param {*} filterValue - Length to compare against
   * @returns {boolean} True if string length matches
   */
  static handleLength(value: FilterValue, filterValue: FilterValue) {
    if (typeof value !== 'string') {
      return false;
    }
    if (typeof filterValue !== 'number') {
      return false;
    }

    return value.length === filterValue;
  }

  /**
   * Checks if a string exactly matches another string
   * @param {*} value - Value to check
   * @param {*} filterValue - String to match against
   * @param {Object} condition - Compiled condition
   * @param {Object} engine - FilterEngine instance for helper methods
   * @returns {boolean} True if strings match exactly
   */
  static handleMatches(value: FilterValue, filterValue: FilterValue, condition?: FilterCondition, _engine?: unknown) {
    // Strict type checking - only strings can match
    if (typeof value !== 'string' || typeof filterValue !== 'string') {
      return false;
    }

    if (!condition?.caseSensitive) {
      return value.toLowerCase() === filterValue.toLowerCase();
    }

    return value === filterValue;
  }

  /**
   * Checks if a string is not empty
   * @param {*} value - Value to check (should be a string)
   * @returns {boolean} True if string is not empty
   */
  static handleNotEmpty(value: FilterValue) {
    if (typeof value !== 'string') {
      return false;
    }

    return value.length > 0;
  }

  /**
   * Checks if two strings are not equal (strict string-only comparison)
   * @param {*} value - Value to check
   * @param {*} filterValue - String to compare against
   * @returns {boolean} True if strings are not equal
   * @throws {Error} If either value is not a string
   */
  static handleNotEquals(value: FilterValue, filterValue: FilterValue) {
    if (typeof value !== 'string') {
      throw new Error(`STRING.NOT_EQUALS requires value to be a string, got ${typeof value}`);
    }
    if (typeof filterValue !== 'string') {
      throw new Error(`STRING.NOT_EQUALS requires filter value to be a string, got ${typeof filterValue}`);
    }

    return value !== filterValue;
  }

  /**
   * Checks if two strings are not identical
   * @param {*} value - Value to check
   * @param {*} filterValue - String to compare against
   * @returns {boolean} True if strings are not identical
   * @throws {Error} If either value is not a string
   */
  static handleNotIdentical(value: FilterValue, filterValue: FilterValue) {
    if (typeof value !== 'string') {
      throw new Error(`STRING.NOT_IDENTICAL requires value to be a string, got ${typeof value}`);
    }
    if (typeof filterValue !== 'string') {
      throw new Error(`STRING.NOT_IDENTICAL requires filter value to be a string, got ${typeof filterValue}`);
    }

    return value !== filterValue;
  }

  /**
   * Checks if a string matches a regular expression
   * @param {*} value - Value to check
   * @param {*} filterValue - Regex pattern
   * @param {Object} condition - Compiled condition with regex
   * @param {Object} engine - FilterEngine instance for helper methods
   * @returns {boolean} True if pattern matches
   */
  static handleRegex(value: FilterValue, filterValue: FilterValue, condition?: FilterCondition, _engine?: unknown) {
    if (condition?.regexError) {
      return false;
    }

    const compiledRegex = condition?.compiledRegex;
    const pattern = Guard.isString(compiledRegex) || Guard.isRegExp(compiledRegex)
      ? compiledRegex
      : (Guard.isString(filterValue) || Guard.isRegExp(filterValue) ? filterValue : String(filterValue));

    return doesValueMatchPattern(value, pattern);
  }

  /**
   * Checks if a string starts with a prefix
   * @param {*} value - Value to check
   * @param {*} filterValue - Prefix to match
   * @param {Object} condition - Compiled condition
   * @param {Object} engine - FilterEngine instance for helper methods
   * @returns {boolean} True if value starts with prefix
   */
  static handleStartsWith(value: FilterValue, filterValue: FilterValue, condition?: FilterCondition, _engine?: unknown) {
    const result = doesStringStartWith(value, filterValue, condition);

    return result;
  }

  /**
   * Checks if a string has a specific word count
   * @param {*} value - Value to check
   * @param {*} filterValue - Number of words expected
   * @returns {boolean} True if word count matches
   * @throws {Error} If value is not a string or filterValue is not a number
   */
  static handleWordCount(value: FilterValue, filterValue: FilterValue) {
    if (typeof value !== 'string') {
      throw new Error(`STRING.WORD_COUNT requires value to be a string, got ${typeof value}`);
    }
    if (typeof filterValue !== 'number') {
      throw new Error(`STRING.WORD_COUNT requires filter value to be a number, got ${typeof filterValue}`);
    }

    // Split by whitespace and filter out empty strings
    const words = value.trim().split(/\s+/)
      .filter((word) => {return word.length > 0;});

    return words.length === filterValue;
  }
}
