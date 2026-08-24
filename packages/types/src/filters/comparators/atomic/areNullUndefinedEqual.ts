/**
 * Checks if values are null or undefined and handles their comparison
 */


export function areNullUndefinedEqual(value: unknown, filterValue: unknown): boolean {
  if (value === null || value === undefined || filterValue === null || filterValue === undefined) {
    // null/undefined are only equal to themselves (strict equality)
    return value === filterValue;
  }

  // No null/undefined values
  return false;
}
