/**
 * Checks if an object has a property at the specified path (supports nested paths)
 *
 * Supports both dot notation and array index notation for traversing nested
 * object structures. This is useful for checking if deeply nested properties
 * exist before attempting to access them.
 *
 * @example
 * const user = { profile: { contacts: [{ email: 'test@example.com' }] } };
 * HasPropertyPath.hasPropertyPath(user, 'profile.contacts[0].email'); // true
 * HasPropertyPath.hasPropertyPath(user, 'profile.contacts[1].email'); // false
 * HasPropertyPath.hasPropertyPath(user, 'profile.address.city'); // false
 */

import { Predicates } from '@studnicky/types';

import { ARRAY_INDEX_SEGMENT_PATTERN } from './constants/ArrayIndexSegmentPattern.js';
import { PROPERTY_PATH_SEGMENT_DELIMITER_PATTERN } from './constants/PropertyPathSegmentDelimiterPattern.js';

const UNSAFE_PATH_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);

export class HasPropertyPath {
  static hasPropertyPath(value: unknown, path: string): boolean {
    if (!Predicates.isRecord(value)) {
      return false;
    }

    // Split path by dots and brackets for array indices
    const segments = path.split(PROPERTY_PATH_SEGMENT_DELIMITER_PATTERN).filter(Boolean);
    let current: unknown = value;

    const segmentsLength = segments.length;

    for (let index = 0; index < segmentsLength; index++) {
      const segment = segments[index];

      if (segment === undefined || UNSAFE_PATH_SEGMENTS.has(segment)) {
        return false;
      }

      // Handle array indices
      if (ARRAY_INDEX_SEGMENT_PATTERN.test(segment)) {
        const arrayIndex = parseInt(segment, 10);

        if (!Predicates.isArray(current) || !(arrayIndex in current)) {
          return false;
        }
        // nosemgrep: javascript.lang.security.audit.prototype-pollution.prototype-pollution-loop.prototype-pollution-loop -- read-only traversal, segment is never a prototype-chain name (guarded above)
        current = current[arrayIndex];
      } else {
        // Handle object properties
        if (!Predicates.isRecord(current) || !Object.hasOwn(current, segment)) {
          return false;
        }
        // nosemgrep: javascript.lang.security.audit.prototype-pollution.prototype-pollution-loop.prototype-pollution-loop -- read-only traversal, segment is never a prototype-chain name (guarded above)
        current = current[segment];
      }
    }

    return true;
  }
}
