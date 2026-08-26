/**
 * Checks if an object has a property with a specific value
 */

import { Predicates } from '../../../predicates/Predicates.js';
import { AreDeeplyEqual } from './areDeeplyEqual.js';

export class DoesObjectContainPropertyValue {
  static doesObjectContainPropertyValue(
    value: unknown,
    propertyName: string,
    expectedValue: unknown
  ): boolean {
    if (!Predicates.doesObjectContainProperty(value, propertyName) || !Predicates.isRecord(value)) {
      return false;
    }

    const result = AreDeeplyEqual.areDeeplyEqual(value[propertyName], expectedValue, { 'caseSensitive': true });
    return result;
  }
}
