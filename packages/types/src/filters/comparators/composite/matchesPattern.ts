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


import { Guard } from '../../../guards/Guard.js';
import { ErrorCodes } from '../../enums/ErrorCodes.js';
import { RegexError } from '../../errors/RegexError.js';
import { isVulnerablePattern } from '../atomic/isVulnerablePattern.js';

/**
 * Converts a string or RegExp to a validated RegExp pattern
 */
function createRegexPattern(regex: RegExp | string): { 'pattern': RegExp;
  'source': string } {
  if (Guard.isRegExp(regex)) {
    return {
      'pattern': regex,
      'source': regex.source
    };
  }

  const patternStr = String(regex);

  try {
    const pattern = new RegExp(regex);

    return {
      'pattern': pattern,
      'source': patternStr
    };
  } catch {
    throw new Error('Invalid regular expression pattern');
  }
}

/**
 * Throws a ReDoS error for high-risk patterns
 */
function throwReDoSError(patternStr: string): never {
  throw new RegexError(
    `Regular expression pattern "${patternStr}" is too dangerous to execute (ReDoS vulnerability detected). Please use a safer pattern.`,
    {
      'errorCode': ErrorCodes.CORE.REDOS_VULNERABILITY,
      'pattern': patternStr,
      'risk': 'high'
    }
  );
}

/**
 * Executes regex test with safety measures for vulnerable patterns
 */
function executeVulnerablePattern(regexPattern: RegExp, stringValue: string, patternStr: string): boolean {
  if (isHighRiskPattern(patternStr)) {
    throwReDoSError(patternStr);
  }

  // For moderately vulnerable patterns, limit the string length significantly
  const limitedString = stringValue.slice(0, 20);

  return regexPattern.test(limitedString);
}

/**
 * Executes regex test with appropriate safety measures
 */
function executePattern(regexPattern: RegExp, stringValue: string, patternStr: string): boolean {
  if (isVulnerablePattern(patternStr)) {
    return executeVulnerablePattern(regexPattern, stringValue, patternStr);
  }

  return regexPattern.test(stringValue);
}

/**
 * Checks if a value matches a regular expression pattern with ReDoS protection
 *
 * Safely tests if the string representation of a value matches the provided
 * regular expression. The function includes built-in protection against
 * Regular Expression Denial of Service (ReDoS) attacks by analyzing patterns
 * for catastrophic backtracking vulnerabilities.
 *
 * @param value - The value to test against the pattern (will be converted to string)
 * @param regex - The regular expression pattern as a RegExp object or string
 * @param _timeout - Timeout parameter (currently unused, reserved for future use)
 * @returns true if the value matches the pattern, false otherwise
 * @throws {RegexError} If the pattern is detected as too dangerous to execute (ReDoS risk)
 *
 * @example
 * doesValueMatchPattern('hello@example.com', /^[^\s@]+@[^\s@]+\.[^\s@]+$/); // true
 * doesValueMatchPattern('invalid-email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/); // false
 * doesValueMatchPattern('test', '^(a+)+$'); // throws RegexError (ReDoS vulnerability)
 */
export function doesValueMatchPattern(value: unknown, regex: RegExp | string): boolean {
  const stringValue = String(value);

  try {
    const {
      pattern, source
    } = createRegexPattern(regex);

    return executePattern(pattern, stringValue, source);
  } catch (error) {
    if (error instanceof RegexError) {
      throw error;
    }

    // If pattern is invalid, return false
    return false;
  }
}


/**
 * Check if a regex pattern is extremely high risk for ReDoS
 */
function isHighRiskPattern(pattern: string | RegExp): boolean {
  // Convert to string if it's a RegExp object
  const patternStr = Guard.isRegExp(pattern) ? pattern.source : String(pattern);

  // Most dangerous patterns that should be blocked immediately

  // Pattern: ^(a+)+$ or ^(a*)*$ or ^(a?)+$ or ^(a{1,10})+$ - these are the classic catastrophic patterns
  if (/^\^?\([^)]*[+*?]\)[+*]\$?$/.test(patternStr)) {
    return true;
  }
  // Also check for curly brace quantifiers
  if (/^\^?\([^)]*\{[^}]+\}\)[+*]\$?$/.test(patternStr)) {
    return true;
  }

  // Pattern: (a+)+ or (a*)* - nested quantifiers of same type
  if (/\([^)]*\+\)\+/.test(patternStr)) {
    return true;
  }
  if (/\([^)]*\*\)\*/.test(patternStr)) {
    return true;
  }

  // Pattern: ((a+)+)+ or ((a*)*)*  - deeply nested quantifiers
  if (/\(\([^)]*[+*]\)[+*]\)[+*]/.test(patternStr)) {
    return true;
  }

  // Pattern: (a|a)* or (a|a)+ where alternatives can match same text
  // This is simplified detection - any alternation with quantifier is risky
  if (/^\^?\([^)|]*\|[^)]*\)[+*]\$?$/.test(patternStr)) {
    return true;
  }

  // Pattern contains multiple nested groups with quantifiers
  let openParens = 0;
  let hasNestedQuantifier = false;

  const patternLength = patternStr.length;

  for (let i = 0; i < patternLength; i++) {
    if (patternStr[i] === '(' && (i === 0 || patternStr[i - 1] !== '\\')) {
      openParens++;
    } else if (patternStr[i] === ')' && (i === 0 || patternStr[i - 1] !== '\\')) {
      openParens--;
      if (openParens > 0 && i + 1 < patternStr.length && /[+*]/.test(patternStr[i + 1] ?? '')) {
        hasNestedQuantifier = true;
      }
    }
  }
  if (hasNestedQuantifier) {
    return true;
  }

  return false;
}
