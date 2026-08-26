/**
 * Validates that both values are strings
 */


export class AreStringsValid {
  static areStringsValid(value: unknown, filterValue: unknown): value is string   {
    const result = typeof value === 'string' && typeof filterValue === 'string';
    return result;
  }
}
