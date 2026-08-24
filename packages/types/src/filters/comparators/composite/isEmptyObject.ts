/**
 * Checks if object (Set, Map, or plain object) is empty
 */


import { isEmptyMap } from '../atomic/isEmptyMap.js';
import { isEmptyPlainObject } from '../atomic/isEmptyPlainObject.js';
import { isEmptySet } from '../atomic/isEmptySet.js';

export function isEmptyObject(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  // Check different object types
  if (isEmptySet(value)) {
    return true;
  }

  if (isEmptyMap(value)) {
    return true;
  }

  if (isEmptyPlainObject(value)) {
    return true;
  }

  return false;
}
