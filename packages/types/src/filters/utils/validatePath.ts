/**
 * @module validatePath
 * @description Validates that paths follow strict dot notation format
 */

export class ValidatePath {
  /**
   * Validates that a path is in proper dot notation format
   * @param path - The path to validate
   * @returns true if valid, false otherwise
   */
  static validatePath(path: string): boolean {
    if (typeof path !== 'string') {
      return false;
    }

    // Allow empty string as a valid field name (edge case but valid in JS)
    if (path === '') {
      return true;
    }

    // Allow single space as a valid field name (edge case but valid in JS)
    if (path === ' ') {
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

    // Must not start or end with dot
    if (path.startsWith('.') || path.endsWith('.')) {
      return false;
    }

    // Must not have consecutive dots
    if (path.includes('..')) {
      return false;
    }

    // Split by dots and validate each segment
    const segments = path.split('.');

    for (const segment of segments) {
      // Each segment must be non-empty
      if (segment.length === 0) {
        return false;
      }

      // Check for array notation (allowed)
      if (segment.includes('[')) {
        const parts = segment.split('[');
        const fieldName = parts[0];
        const bracketPart = parts[1];

        // Must have field name before bracket
        if (fieldName === undefined || fieldName.length === 0) {
          return false;
        }

        // Validate field name part
        if (!ValidatePath.isValidSegment(fieldName)) {
          return false;
        }

        // Check bracket part
        if (parts.length !== 2 || !bracketPart?.endsWith(']')) {
          return false;
        }

        // Remove closing bracket
        const indexPart = bracketPart.slice(0, -1);

        // Index must be number or wildcard
        if (indexPart !== '*' && !/^\d+$/.test(indexPart)) {
          return false;
        }
      } else {
        // Regular segment - validate identifier
        if (!ValidatePath.isValidSegment(segment)) {
          return false;
        }
      }
    }

    return true;
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

      return codePoint <= 0x1f || codePoint === 0x7f || dangerousMarkupChars.has(char);
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
