/**
 * Checks if values are null or undefined and handles their comparison
 */


export class AreNullUndefinedEqual {
  static areNullUndefinedEqual(value: unknown, filterValue: unknown): boolean   {
    if (value === null || value === undefined || filterValue === null || filterValue === undefined) {
      // null/undefined are only equal to themselves (strict equality)
      const result = value === filterValue;
      return result;
    }

    // No null/undefined values
    return false;
  }
}
