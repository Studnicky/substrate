/**
 * Checks if an object has all of the specified properties
 */

import type { FilterValueEntity } from '../../FilterValueEntity.js';

import { Predicates } from '../../../predicates/Predicates.js';

export class DoesObjectContainAllProperties {
  static doesObjectContainAllProperties(value: FilterValueEntity.Type, propertyNames: string[]): boolean {
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
