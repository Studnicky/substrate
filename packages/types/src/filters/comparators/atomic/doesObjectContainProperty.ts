/**
 * Checks if an object has a specific property
 */

import { Guard } from '../../../guards/Guard.js';

export class DoesObjectContainProperty {
  static doesObjectContainProperty(candidate: unknown, propertyName: string): boolean   {
    if (!Guard.isRecord(candidate)) {
      return false;
    }

    const result = Object.hasOwn(candidate, propertyName);
    return result;
  }
}
