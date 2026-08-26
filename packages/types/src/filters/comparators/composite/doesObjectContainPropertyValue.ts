/**
 * Checks if an object has a property with a specific value
 */

import { Guard } from '../../../guards/Guard.js';
import { DoesObjectContainProperty } from '../atomic/doesObjectContainProperty.js';
import { AreDeeplyEqual } from './areDeeplyEqual.js';

export class DoesObjectContainPropertyValue {
  static doesObjectContainPropertyValue(
    value: unknown,
    propertyName: string,
    expectedValue: unknown
  ): boolean {
    if (!DoesObjectContainProperty.doesObjectContainProperty(value, propertyName) || !Guard.isRecord(value)) {
      return false;
    }

    const result = AreDeeplyEqual.areDeeplyEqual(value[propertyName], expectedValue, { 'caseSensitive': true });
    return result;
  }
}
