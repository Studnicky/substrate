/**
 * Checks if object (Set, Map, or plain object) is empty
 */

import { IsEmptyMap } from '../atomic/isEmptyMap.js';
import { IsEmptyPlainObject } from '../atomic/isEmptyPlainObject.js';
import { IsEmptySet } from '../atomic/isEmptySet.js';

export class IsEmptyObject {
  static isEmptyObject(value: unknown): boolean {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    // Check different object types
    if (IsEmptySet.isEmptySet(value)) {
      return true;
    }

    if (IsEmptyMap.isEmptyMap(value)) {
      return true;
    }

    if (IsEmptyPlainObject.isEmptyPlainObject(value)) {
      return true;
    }

    return false;
  }
}
