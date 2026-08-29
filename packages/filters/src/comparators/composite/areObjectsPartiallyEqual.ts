/**
 * Checks if an object contains all properties from a partial object (Jest objectContaining style)
 */

import { Predicates } from '@studnicky/types';

import { DoesObjectContainPropertyValue } from './doesObjectContainPropertyValue.js';

export class AreObjectsPartiallyEqual {
  static areObjectsPartiallyEqual(value: unknown, partialValue: unknown): boolean {
    if (!Predicates.isRecord(value) || !Predicates.isRecord(partialValue)) {
      return false;
    }

    const result = Object.keys(partialValue).every((key) => {
      const propertyMatches = DoesObjectContainPropertyValue.doesObjectContainPropertyValue(value, key, partialValue[key]);
      return propertyMatches;
    });

    return result;
  }
}
