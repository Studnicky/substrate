/**
 * Checks if a collection has duplicate elements
 */

export class HasDuplicates {
  /**
   * Checks if an array has duplicate elements
   * @param value - The collection to check
   * @returns true if there are duplicates, false otherwise
   */
  static hasDuplicates(value: unknown): boolean {
    if (Array.isArray(value)) {
      const result = new Set(value).size < value.length;
      return result;
    }

    if (value instanceof Set) {
      // Sets cannot have duplicates by definition
      return false;
    }

    return false;
  }
}
