/**
 * Handles NaN comparison for strict equality (NaN !== NaN per JavaScript semantics)
 */


export function areNaNStrict(value: unknown, filterValue: unknown): boolean {
  if (Number.isNaN(value) || Number.isNaN(filterValue)) {
    // NaN should not equal NaN (JavaScript semantics)
    return false;
  }

  // Neither is NaN
  return false;
}
