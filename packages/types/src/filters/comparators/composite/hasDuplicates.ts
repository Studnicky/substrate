/**
 * Checks if a collection has duplicate elements
 */


/**
 * Checks if an array has duplicate elements
 * @param value - The collection to check
 * @returns true if there are duplicates, false otherwise
 */
export function hasDuplicates(value: unknown): boolean {
  if (Array.isArray(value)) {
    return new Set(value).size < value.length;
  }

  if (value instanceof Set) {
    // Sets cannot have duplicates by definition
    return false;
  }

  return false;
}
