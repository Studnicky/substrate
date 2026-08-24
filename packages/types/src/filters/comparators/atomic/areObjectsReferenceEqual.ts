/**
 * Handles object comparison using reference equality
 */


export class AreObjectsReferenceEqual {
  static areObjectsReferenceEqual(value: unknown, filterValue: unknown): boolean   {
    if ((typeof value === 'object' && value !== null) || (typeof filterValue === 'object' && filterValue !== null)) {
      // Both must be objects for comparison
      if (typeof value !== 'object' || typeof filterValue !== 'object' || value === null || filterValue === null) {
        return false;
      }

      // Use reference equality for ALL objects (including Date, RegExp, etc.)
      // This means new Date('2023-01-01') !== new Date('2023-01-01')
      // and [1,2,3] !== [1,2,3] if they are different object instances
      return value === filterValue;
    }

    // Not objects
    return false;
  }
}
