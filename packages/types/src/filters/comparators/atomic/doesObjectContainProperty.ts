/**
 * Checks if an object has a specific property
 */

import { Guard } from '../../../guards/Guard.js';

export function doesObjectContainProperty(obj: unknown, propertyName: string): boolean {
  if (!Guard.isRecord(obj)) {
    return false;
  }

  return Object.prototype.hasOwnProperty.call(obj, propertyName);
}
