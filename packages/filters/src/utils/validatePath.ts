/**
 * @module validatePath
 * @description Validates that paths follow strict dot notation format
 */

import { WHOLE_NUMBER_PATTERN } from './constants/WholeNumberPattern.js';

export class ValidatePath {
  /**
   * Validates that a path is in proper dot notation format
   * @param path - The path to validate
   * @returns true if valid, false otherwise
   */
  static validatePath(path: string): boolean {
    const earlyResult = ValidatePath.checkEarlyExit(path);

    if (earlyResult !== null) {
      return earlyResult;
    }

    // Split by dots and validate each segment
    const segments = path.split('.');

    for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex++) {
      if (!ValidatePath.isValidPathSegment(segments[segmentIndex]!)) {
        return false;
      }
    }

    return true;
  }

  /** `null` means none of the shortcut cases apply, so the caller falls through to segment-by-segment validation. */
  private static checkEarlyExit(path: string): boolean | null {
    if (typeof path !== 'string') {
      return false;
    }

    // Allow empty string or a single space as a valid field name (edge case but valid in JS)
    if (path === '' || path === ' ') {
      return true;
    }

    // For other whitespace-only strings, reject them
    if (path.trim().length === 0) {
      return false;
    }

    // Handle bracket notation with quoted keys like ["special.key"]
    if (path.startsWith('[') && path.includes('"]')) {
      // This is bracket notation with quoted keys
      // For now, accept it as valid - getPathValue will need to handle it
      return true;
    }

    // Must not start or end with dot, and must not have consecutive dots
    if (path.startsWith('.') || path.endsWith('.') || path.includes('..')) {
      return false;
    }

    return null;
  }

  private static isValidPathSegment(segment: string): boolean {
    // Each segment must be non-empty
    if (segment.length === 0) {
      return false;
    }

    // Check for array notation (allowed)
    if (!segment.includes('[')) {
      // Regular segment - validate identifier
      const result = ValidatePath.isValidSegment(segment);

      return result;
    }

    const result = ValidatePath.isValidBracketedSegment(segment);

    return result;
  }

  private static isValidBracketedSegment(segment: string): boolean {
    const parts = segment.split('[');
    const fieldName = parts[0];
    const bracketPart = parts[1];

    // Must have field name before bracket, and it must validate as an identifier
    if (fieldName === undefined || fieldName.length === 0 || !ValidatePath.isValidSegment(fieldName)) {
      return false;
    }

    // Check bracket part
    if (parts.length !== 2 || bracketPart === undefined) {
      return false;
    }
    if (!bracketPart.endsWith(']')) {
      return false;
    }

    // Remove closing bracket; index must be number or wildcard
    const indexPart = bracketPart.slice(0, -1);
    const result = indexPart === '*' || WHOLE_NUMBER_PATTERN.test(indexPart);

    return result;
  }

  /**
   * Validates that a segment is a valid identifier
   */
  private static isValidSegment(segment: string): boolean {
    // Allow Unicode letters, numbers, underscores, and common special chars
    // This regex allows:
    // - Unicode letters (\p{L})
    // - Unicode numbers (\p{N})
    // - Underscores, hyphens, dollar signs, at signs
    // - Must not be empty
    if (segment.length === 0) {
      return false;
    }

    // For broader compatibility, allow most characters except those that could cause issues.
    // Block only truly dangerous characters: ASCII control characters (checked by code
    // point, not a regex control-character class, to avoid matching literal control bytes)
    // plus a fixed set of markup/shell metacharacters.
    const dangerousMarkupChars = new Set([
      '"', '\'', '<', '>', '\\', '`', '|'
    ]);
    const hasDangerousChar = [...segment].some((char) => {
      const codePoint = char.codePointAt(0) ?? 0;
      const isDangerous = codePoint <= 0x1f || codePoint === 0x7f || dangerousMarkupChars.has(char);

      return isDangerous;
    });

    if (hasDangerousChar) {
      return false;
    }

    // Cannot be dangerous property names
    const dangerousNames = new Set([
      '__defineGetter__',
      '__defineSetter__',
      '__lookupGetter__',
      '__lookupSetter__',
      '__proto__',
      'constructor',
      'hasOwnProperty',
      'isPrototypeOf',
      'propertyIsEnumerable',
      'prototype',
      'toString',
      'valueOf'
    ]);

    if (dangerousNames.has(segment)) {
      return false;
    }

    // Cannot start with double underscore
    if (segment.startsWith('__')) {
      return false;
    }

    return true;
  }
}
