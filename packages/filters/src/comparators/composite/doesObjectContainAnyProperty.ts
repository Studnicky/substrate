/**
 * Checks if an object has any of the specified properties
 */

import { Predicates } from '@studnicky/types/node';


export class DoesObjectContainAnyProperty {
  static doesObjectContainAnyProperty(value: unknown, propertyNames: string[]): boolean {
    if (typeof value !== 'object' || value === null || !Array.isArray(propertyNames)) {
      return false;
    }

    const result = propertyNames.some((propertyName) => {
      const hasProperty = Predicates.doesObjectContainProperty(value, propertyName);
      return hasProperty;
    });

    return result;
  }
}
