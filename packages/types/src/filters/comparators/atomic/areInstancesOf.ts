/**
 * Checks if both values are instances of the same constructor type
 */

export class AreInstancesOf {
  static areInstancesOf<T>(
    value: unknown,
    filterValue: unknown,
    constructor: new (..._constructorArguments: unknown[]) => T
  ): value is T {
    const result = value instanceof constructor && filterValue instanceof constructor;
    return result;
  }
}
