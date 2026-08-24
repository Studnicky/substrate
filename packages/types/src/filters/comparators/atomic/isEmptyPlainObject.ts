/**
 * Checks if plain object has no enumerable properties
 */

export class IsEmptyPlainObject {
  static isEmptyPlainObject(value: unknown): boolean   {
    if (Object.prototype.toString.call(value) !== '[object Object]') {
      return false;
    }

    for (const key in value as Record<string, unknown>) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        return false;
      }
    }

    return true;
  }
}
