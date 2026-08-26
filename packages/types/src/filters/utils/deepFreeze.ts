/**
 * @module deepFreeze
 * @description Utility for deep freezing objects to ensure complete immutability
 */

export class DeepFreeze {
  /**
   * Recursively freeze an object and all its properties
   */
  static deepFreeze<T>(object: T): T {
    // Retrieve property names defined on object
    const propNames = Object.getOwnPropertyNames(object);

    // Freeze properties before freezing self
    const propNamesLength = propNames.length;

    for (let i = 0; i < propNamesLength; i++) {
      const name = propNames[i];
      if (name === undefined) { continue; }
      const value = (object as Record<string, unknown>)[name];

      if (value !== null && typeof value === 'object') {
        DeepFreeze.deepFreeze(value);
      }
    }

    const result = Object.freeze(object);

    return result;
  }
}
