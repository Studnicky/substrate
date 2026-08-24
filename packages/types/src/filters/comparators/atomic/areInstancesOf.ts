/**
 * Checks if both values are instances of the same constructor type
 */

export class AreInstancesOf {
  static areInstancesOf<T>(
    value: unknown,
    filterValue: unknown,
    constructor: new (..._args: unknown[]) => T
  ): value is T {
    return value instanceof constructor && filterValue instanceof constructor;
  }
}
