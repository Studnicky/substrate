/**
 * Checks if values have the same primitive type using typeof
 */


export class AreTypesSame {
  static areTypesSame(value: unknown, filterValue: unknown): boolean   {
    const result = typeof value === typeof filterValue;
    return result;
  }
}
