/**
 * Checks if an object has all of the specified properties
 */

import { Predicates } from '@studnicky/types/node';


export class DoesObjectContainAllProperties {
  static doesObjectContainAllProperties(value: unknown, propertyNames: string[]): boolean {
    if (typeof value !== 'object' || value === null || !Array.isArray(propertyNames)) {
      return false;
    }

    const result = propertyNames.every((propertyName) => {
      const hasProperty = Predicates.doesObjectContainProperty(value, propertyName);
      return hasProperty;
    });

    return result;
  }
}
