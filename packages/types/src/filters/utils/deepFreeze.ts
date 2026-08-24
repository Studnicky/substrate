/**
 * @module deepFreeze
 * @description Utility for deep freezing objects to ensure complete immutability
 */

export class DeepFreeze {
  /**
   * Recursively freeze an object and all its properties
   */
  static deepFreeze<T>(obj: T): T {
    // Retrieve property names defined on obj
    const propNames = Object.getOwnPropertyNames(obj);

    // Freeze properties before freezing self
    const propNamesLength = propNames.length;

    for (let i = 0; i < propNamesLength; i++) {
      const name = propNames[i];
      if (name === undefined) { continue; }
      const value = (obj as Record<string, unknown>)[name];

      if (value && typeof value === 'object') {
        DeepFreeze.deepFreeze(value);
      }
    }

    return Object.freeze(obj);
  }
}
