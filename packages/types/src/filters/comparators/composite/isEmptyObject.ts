/**
 * Checks if object (Set, Map, or plain object) is empty
 */

import { Predicates } from '../../../predicates/Predicates.js';

export class IsEmptyObject {
  static isEmptyObject(value: unknown): boolean {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    // Check different object types
    if (Predicates.isEmptySet(value)) {
      return true;
    }

    if (Predicates.isEmptyMap(value)) {
      return true;
    }

    if (Predicates.isEmptyPlainObject(value)) {
      return true;
    }

    return false;
  }
}
