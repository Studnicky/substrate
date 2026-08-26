/**
 * Checks if two values are reference equal using Object.is semantics
 * More precise than === for NaN and -0/+0 comparisons
 */


export class AreReferenceEqual {
  static areReferenceEqual(value: unknown, filterValue: unknown): boolean   {
    if (value === filterValue) {
      // Object.is semantics: +0 and -0 are distinct despite `===` treating them as equal
      const result = value !== 0 || 1 / (value as number) === 1 / (filterValue as number);
      return result;
    }

    // Object.is semantics: NaN is equal to itself despite `===` treating it as unequal
    const result = value !== value && filterValue !== filterValue;
    return result;
  }
}
