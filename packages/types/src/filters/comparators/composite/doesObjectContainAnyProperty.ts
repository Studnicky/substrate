/**
 * Checks if an object has any of the specified properties
 */

import type { FilterValue } from '../../types.js';

import { doesObjectContainProperty } from '../atomic/doesObjectContainProperty.js';

export function doesObjectContainAnyProperty(obj: FilterValue, propertyNames: string[]): boolean {
  if (typeof obj !== 'object' || obj === null || !Array.isArray(propertyNames)) {
    return false;
  }

  return propertyNames.some((propertyName) => {return doesObjectContainProperty(obj, propertyName);});
}
