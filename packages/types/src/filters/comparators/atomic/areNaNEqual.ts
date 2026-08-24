/**
 * Handles NaN comparison for deep equality (NaN === NaN is true for deep equality)
 *
 * @param value - The first value to compare
 * @param filterValue - The second value to compare
 * @returns true if both values are NaN, false otherwise
 */


export class AreNaNEqual {
  static areNaNEqual(value: unknown, filterValue: unknown): boolean   {
    if (Number.isNaN(value) && Number.isNaN(filterValue)) {
      // Both are NaN, so they are deeply equal
      return true;
    }
    if (Number.isNaN(value) || Number.isNaN(filterValue)) {
      // Only one is NaN
      return false;
    }

    // Neither is NaN
    return false;
  }
}
