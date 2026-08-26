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

import { Guard } from '../../../guards/Guard.js';
import { ARRAY_INDEX_SEGMENT_PATTERN } from './constants/ArrayIndexSegmentPattern.js';
import { PROPERTY_PATH_SEGMENT_DELIMITER_PATTERN } from './constants/PropertyPathSegmentDelimiterPattern.js';

export class HasPropertyPath {
  static hasPropertyPath(value: unknown, path: string): boolean {
    if (!Guard.isRecord(value)) {
      return false;
    }

    // Split path by dots and brackets for array indices
    const segments = path.split(PROPERTY_PATH_SEGMENT_DELIMITER_PATTERN).filter(Boolean);
    let current: unknown = value;

    const segmentsLength = segments.length;

    for (let index = 0; index < segmentsLength; index++) {
      const segment = segments[index];

      if (segment === undefined) {
        return false;
      }

      // Handle array indices
      if (ARRAY_INDEX_SEGMENT_PATTERN.test(segment)) {
        const arrayIndex = parseInt(segment, 10);

        if (!Guard.isArray(current) || !(arrayIndex in current)) {
          return false;
        }
        current = current[arrayIndex];
      } else {
        // Handle object properties
        if (!Guard.isRecord(current) || !(segment in current)) {
          return false;
        }
        current = current[segment];
      }
    }

    return true;
  }
}
