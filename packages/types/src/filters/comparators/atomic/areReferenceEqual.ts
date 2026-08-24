/**
 * Checks if two values are reference equal using Object.is semantics
 * More precise than === for NaN and -0/+0 comparisons
 */


export class AreReferenceEqual {
  static areReferenceEqual(value: unknown, filterValue: unknown): boolean   {
    return Object.is(value, filterValue);
  }
}
