/**
 * Checks if an object has a property with a specific value
 */

import { Guard } from '../../../guards/Guard.js';
import { doesObjectContainProperty } from '../atomic/doesObjectContainProperty.js';
import { areDeeplyEqual } from './deepEquals.js';

export function doesObjectContainPropertyValue(
  obj: unknown,
  propertyName: string,
  expectedValue: unknown
): boolean {
  if (!doesObjectContainProperty(obj, propertyName) || !Guard.isRecord(obj)) {
    return false;
  }

  return areDeeplyEqual(obj[propertyName], expectedValue, { 'caseSensitive': true });
}
