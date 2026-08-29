/**
 * Checks if a collection has all unique elements
 */

export class HasUniqueElements {
  /**
   * Checks if an array or Set has all unique elements (no duplicates)
   * @param value - The collection to check
   * @returns true if all elements are unique, false otherwise
   */
  static hasUniqueElements(value: unknown): boolean {
    if (Array.isArray(value)) {
      const result = new Set(value).size === value.length;
      return result;
    }

    if (value instanceof Set) {
      // Sets always have unique elements by definition
      return true;
    }

    return false;
  }
}
