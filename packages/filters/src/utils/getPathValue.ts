/**
 * @module getPathValue
 * @description Extracts values from objects using dot notation paths with security protections
 */

import { Predicates } from '@studnicky/types';

import { FilterValueGuard } from '../FilterValueGuard.js';
import { FilterTypeGuards } from '../interfaces.js';
import { BRACKETED_KEY_PATTERN } from './constants/BracketedKeyPattern.js';

/**
 * List of dangerous property names that should not be accessed
 */
const DANGEROUS_PROPERTIES = new Set([
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

export class GetPathValue {
  /**
   * Checks if a property name is safe to access
   */
  private static isSafeProperty(propertyName: string): boolean {
    // Block dangerous prototype properties
    if (DANGEROUS_PROPERTIES.has(propertyName)) {
      return false;
    }

    // Block properties that start with double underscores
    if (propertyName.startsWith('__')) {
      return false;
    }

    // Block file system traversal attempts
    if (propertyName.includes('../') || propertyName.includes('..\\')) {
      return false;
    }

    // Block property names with spaces for security
    if (propertyName.includes(' ')) {
      return false;
    }

    return true;
  }

  /**
   * Reads one named field off a traversal-current value, only once `Predicates.isRecord` has proven it
   * holds named fields at all. Anything else reads as `undefined`, matching a missing property
   * rather than throwing.
   */
  private static readField(current: unknown, key: string): unknown {
    const result = Predicates.isRecord(current) ? current[key] : undefined;
    return result;
  }

  /**
   * Processes array indexing in path notation
   */
  private static processArrayIndexing(part: string, current: unknown, path: string, parts: string[], index: number): { 'isWildcard': boolean;
    'value': unknown } {
    const [
      fieldName,
      indexPart
    ] = part.split('[');

    if (fieldName === undefined || indexPart === undefined) {
      return {
        'isWildcard': false,
        'value': undefined
      };
    }
    const arrayIndex = indexPart.slice(0, -1);

    // Security check for array field name
    if (!GetPathValue.isSafeProperty(fieldName)) {
      return {
        'isWildcard': false,
        'value': undefined
      };
    }

    const arrayValue = GetPathValue.readField(current, fieldName);

    if (!Predicates.isArray(arrayValue)) {
      return {
        'isWildcard': false,
        'value': undefined
      };
    }

    if (arrayIndex === '*') {
      return {
        'isWildcard': true,
        'value': {
          'array': arrayValue,
          'arrayWildcard': true,
          'fullPath': path,
          'remainingPath': parts.slice(index + 1)
        }
      };
    }

    const arrayIndexNumber = Number(arrayIndex) | 0;
    const value: unknown = arrayValue.at(arrayIndexNumber);

    return {
      'isWildcard': false,
      'value': value
    };
  }

  /**
   * Extracts a value from an object using dot notation path
   * Supports array indexing and wildcard syntax (path[*])
   */
  static getPathValue(targetValue: unknown, path: string, maximumDepth?: number): unknown {
    if (path === '') {
      return targetValue;
    }

    // Handle bracket notation with quoted keys like ["special.key"]
    if (path.startsWith('[') && path.includes('"]')) {
      // Extract the key from ["key"] or ["key"]["otherKey"]
      const matches = [...path.matchAll(BRACKETED_KEY_PATTERN)];

      if (matches.length > 0) {
        let current: unknown = targetValue;

        for (let matchIndex = 0; matchIndex < matches.length; matchIndex++) {
          const key = matches[matchIndex]![0].slice(2, -2); // Remove [" and "]

          if (current === null || current === undefined) {
            return undefined;
          }
          current = GetPathValue.readField(current, key);
        }

        const bracketResult = FilterValueGuard.intake(current);

        return bracketResult;
      }
    }

    const parts = path.split('.');
    let current: unknown = targetValue;
    const partsLength = parts.length;

    // Check if path depth exceeds maximum
    if (maximumDepth !== undefined && partsLength > maximumDepth) {
      // Return undefined for paths that are too deep
      return undefined;
    }

    for (let i = 0; i < partsLength; i++) {
      const part = parts[i];

      if (part === undefined || part === '') {
        continue;
      }

      if (current === null || current === undefined) {
        return undefined;
      }

      if (part.includes('[') && part.includes(']')) {
        const result = GetPathValue.processArrayIndexing(part, current, path, parts, i);

        if (result.isWildcard) {
          const wildcardResult = FilterTypeGuards.isArrayWildcardValue(result.value) ? result.value : FilterValueGuard.intake(result.value);

          return wildcardResult;
        }
        current = result.value;
      } else {
        // Security check: prevent access to dangerous properties
        if (!GetPathValue.isSafeProperty(part)) {
          return undefined;
        }
        current = GetPathValue.readField(current, part);
      }
    }

    const finalResult = FilterValueGuard.intake(current);

    return finalResult;
  }
}
