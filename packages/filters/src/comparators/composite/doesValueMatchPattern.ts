/**
 * Regular expression pattern matching with ReDoS (Regular Expression Denial of Service) protection
 *
 * Provides safe regex matching by detecting and preventing execution of patterns
 * that could cause catastrophic backtracking and potentially crash the application.
 * High-risk patterns are blocked immediately, while moderate-risk patterns are
 * executed with string length limitations.
 *
 * @throws {RegexError} When a pattern is detected as too dangerous to execute
 */

import { Predicates } from '@studnicky/types';

import { ErrorCodes } from '../../enums/ErrorCodes.js';
import { RegexError } from '../../errors/RegexError.js';
import { HIGH_RISK_REGEX_PATTERNS } from './constants/HighRiskRegexPatterns.js';
import { QUANTIFIER_CHARACTER_PATTERN } from './constants/QuantifierCharacterPattern.js';

export class DoesValueMatchPattern {
  /**
   * Checks if a value matches a regular expression pattern with ReDoS protection
   *
   * Safely tests if the string representation of a value matches the provided
   * regular expression. The function includes built-in protection against
   * Regular Expression Denial of Service (ReDoS) attacks by analyzing patterns
   * for catastrophic backtracking vulnerabilities.
   *
   * @example
   * DoesValueMatchPattern.doesValueMatchPattern('hello@example.com', /^[^\s@]+@[^\s@]+\.[^\s@]+$/); // true
   * DoesValueMatchPattern.doesValueMatchPattern('invalid-email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/); // false
   * DoesValueMatchPattern.doesValueMatchPattern('test', '^(a+)+$'); // throws RegexError (ReDoS vulnerability)
   */
  static doesValueMatchPattern(value: unknown, regex: RegExp | string): boolean {
    const stringValue = String(value);

    try {
      const {
        pattern, source
      } = DoesValueMatchPattern.createRegexPattern(regex);

      const result = DoesValueMatchPattern.executePattern(pattern, stringValue, source);
      return result;
    } catch (error) {
      if (error instanceof RegexError) {
        throw error;
      }

      // If pattern is invalid, return false
      return false;
    }
  }

  /**
   * Converts a string or RegExp to a validated RegExp pattern
   */
  private static createRegexPattern(regex: RegExp | string): { 'pattern': RegExp;
    'source': string } {
    if (Predicates.isRegExp(regex)) {
      return {
        'pattern': regex,
        'source': regex.source
      };
    }

    const patternString = String(regex);

    try {
      // nosemgrep: javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp -- executePattern risk-analyzes the source against HIGH_RISK_REGEX_PATTERNS before matching
      const pattern = new RegExp(regex);

      return {
        'pattern': pattern,
        'source': patternString
      };
    } catch {
      throw new RegexError('Invalid regular expression pattern', { 'pattern': patternString });
    }
  }

  /**
   * Throws a ReDoS error for high-risk patterns
   */
  private static throwReDoSError(patternString: string): never {
    throw new RegexError(
      `Regular expression pattern "${patternString}" is too dangerous to execute (ReDoS vulnerability detected). Please use a safer pattern.`,
      {
        'errorCode': ErrorCodes.CORE.REDOS_VULNERABILITY,
        'pattern': patternString,
        'risk': 'high'
      }
    );
  }

  /**
   * Executes regex test with safety measures for vulnerable patterns
   */
  private static executeVulnerablePattern(regexPattern: RegExp, stringValue: string, patternString: string): boolean {
    if (DoesValueMatchPattern.isHighRiskPattern(patternString)) {
      DoesValueMatchPattern.throwReDoSError(patternString);
    }

    // For moderately vulnerable patterns, limit the string length significantly
    const limitedString = stringValue.slice(0, 20);

    const result = regexPattern.test(limitedString);
    return result;
  }

  /**
   * Executes regex test with appropriate safety measures
   */
  private static executePattern(regexPattern: RegExp, stringValue: string, patternString: string): boolean {
    if (Predicates.isVulnerablePattern(patternString)) {
      const result = DoesValueMatchPattern.executeVulnerablePattern(regexPattern, stringValue, patternString);
      return result;
    }

    const result = regexPattern.test(stringValue);
    return result;
  }

  /**
   * Check if a regex pattern is extremely high risk for ReDoS
   */
  private static isHighRiskPattern(pattern: string | RegExp): boolean {
    // Convert to string if it's a RegExp object
    const patternString = Predicates.isRegExp(pattern) ? pattern.source : String(pattern);

    const matchesKnownHighRiskShape = HIGH_RISK_REGEX_PATTERNS.some((riskPattern) => {
      const matches = riskPattern.test(patternString);
      return matches;
    });

    if (matchesKnownHighRiskShape) {
      return true;
    }

    const result = DoesValueMatchPattern.hasNestedQuantifierGroups(patternString);
    return result;
  }

  /**
   * Checks for multiple nested groups with quantifiers, e.g. ((a+)+)+
   */
  private static hasNestedQuantifierGroups(patternString: string): boolean {
    let openParenthesesCount = 0;
    const patternLength = patternString.length;

    for (let index = 0; index < patternLength; index++) {
      if (patternString[index] === '(' && (index === 0 || patternString[index - 1] !== '\\')) {
        openParenthesesCount++;
      } else if (patternString[index] === ')' && (index === 0 || patternString[index - 1] !== '\\')) {
        openParenthesesCount--;
        if (openParenthesesCount > 0 && index + 1 < patternString.length && QUANTIFIER_CHARACTER_PATTERN.test(patternString[index + 1] ?? '')) {
          return true;
        }
      }
    }

    return false;
  }
}
