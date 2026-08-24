/**
 * Checks if an object contains all properties from a partial object (Jest objectContaining style)
 */

import { Guard } from '../../../guards/Guard.js';
import { doesObjectContainPropertyValue } from './doesObjectContainPropertyValue.js';

export function areObjectsPartiallyEqual(obj: unknown, partialObj: unknown): boolean {
  if (!Guard.isRecord(obj) || !Guard.isRecord(partialObj)) {
    return false;
  }

  return Object.keys(partialObj).every((key) => {
    return doesObjectContainPropertyValue(obj, key, partialObj[key]);
  });
}
