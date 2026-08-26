/**
 * Checks if plain object has no enumerable properties
 */

export class IsEmptyPlainObject {
  static isEmptyPlainObject(value: unknown): boolean   {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return false;
    }

    const prototype: unknown = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      return false;
    }

    const keys = Object.keys(value);
    const result = keys.length === 0;
    return result;
  }
}
