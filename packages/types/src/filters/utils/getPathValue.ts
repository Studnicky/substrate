/**
 * @module getPathValue
 * @description Extracts values from objects using dot notation paths with security protections
 */

import type { ArrayWildcardValue, FilterValue } from '../types.js';

import { Guard } from '../../guards/Guard.js';
import { FilterValueEntity } from '../FilterValueEntity.js';
import { isArrayWildcardValue } from '../types.js';

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
   * Reads one named field off a traversal-current value, only once `Guard.isRecord` has proven it
   * holds named fields at all. Anything else reads as `undefined`, matching a missing property
   * rather than throwing.
   */
  private static readField(current: unknown, key: string): unknown {
    const result = Guard.isRecord(current) ? current[key] : undefined;
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

    if (!Guard.isArray(arrayValue)) {
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

    const arrayIdx = Number(arrayIndex) | 0;
    const value: unknown = arrayValue.at(arrayIdx);

    return {
      'isWildcard': false,
      'value': value
    };
  }

  /**
   * Extracts a value from an object using dot notation path
   * Supports array indexing and wildcard syntax (path[*])
   */
  static getPathValue(obj: FilterValue, path: string, maxDepth?: number): FilterValue | ArrayWildcardValue {
    if (!path) {
      return obj;
    }

    // Handle bracket notation with quoted keys like ["special.key"]
    if (path.startsWith('[') && path.includes('"]')) {
      // Extract the key from ["key"] or ["key"]["otherKey"]
      const matches = path.match(/\["([^"]+)"\]/g);

      if (matches) {
        let current: unknown = obj;

        for (const match of matches) {
          const key = match.slice(2, -2); // Remove [" and "]

          if (current === null || current === undefined) {
            return undefined;
          }
          current = GetPathValue.readField(current, key);
        }

        return FilterValueEntity.intake(current);
      }
    }

    const parts = path.split('.');
    let current: unknown = obj;
    const partsLength = parts.length;

    // Check if path depth exceeds maximum
    if (maxDepth !== undefined && partsLength > maxDepth) {
      // Return undefined for paths that are too deep
      return undefined;
    }

    for (let i = 0; i < partsLength; i++) {
      const part = parts[i];

      if (!part) {
        continue;
      }

      if (current === null || current === undefined) {
        return undefined;
      }

      if (part.includes('[') && part.includes(']')) {
        const result = GetPathValue.processArrayIndexing(part, current, path, parts, i);

        if (result.isWildcard) {
          return isArrayWildcardValue(result.value) ? result.value : FilterValueEntity.intake(result.value);
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

    return FilterValueEntity.intake(current);
  }
}
