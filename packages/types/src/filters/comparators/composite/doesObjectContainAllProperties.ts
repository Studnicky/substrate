/**
 * Checks if an object has all of the specified properties
 */

import type { FilterValue } from '../../types.js';

import { doesObjectContainProperty } from '../atomic/doesObjectContainProperty.js';

export function doesObjectContainAllProperties(obj: FilterValue, propertyNames: string[]): boolean {
  if (typeof obj !== 'object' || obj === null || !Array.isArray(propertyNames)) {
    return false;
  }

  return propertyNames.every((propertyName) => {return doesObjectContainProperty(obj, propertyName);});
}
