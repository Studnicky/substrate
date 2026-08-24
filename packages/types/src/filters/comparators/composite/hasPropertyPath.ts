/**
 * Checks if an object has a property at the specified path (supports nested paths)
 *
 * Supports both dot notation and array index notation for traversing nested
 * object structures. This is useful for checking if deeply nested properties
 * exist before attempting to access them.
 *
 * @param value - The object to check for the property path
 * @param path - The property path using dot notation and/or array indices (e.g., 'user.address.city' or 'items[0].name')
 * @returns true if the property exists at the specified path, false otherwise
 *
 * @example
 * const user = { profile: { contacts: [{ email: 'test@example.com' }] } };
 * hasPropertyPath(user, 'profile.contacts[0].email'); // true
 * hasPropertyPath(user, 'profile.contacts[1].email'); // false
 * hasPropertyPath(user, 'profile.address.city'); // false
 */

import { Guard } from '../../../guards/Guard.js';

export function hasPropertyPath(value: unknown, path: string): boolean {
  if (!Guard.isRecord(value)) {
    return false;
  }

  // Split path by dots and brackets for array indices
  const segments = path.split(/\.|\[|\]/).filter(Boolean);
  let current: unknown = value;

  for (const segment of segments) {
    // Handle array indices
    if (/^\d+$/.test(segment)) {
      const index = parseInt(segment, 10);

      if (!Guard.isArray(current) || !(index in current)) {
        return false;
      }
      current = current[index];
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
