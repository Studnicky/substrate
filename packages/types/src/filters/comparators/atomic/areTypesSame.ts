/**
 * Checks if values have the same primitive type using typeof
 */


export class AreTypesSame {
  static areTypesSame(value: unknown, filterValue: unknown): boolean   {
    return typeof value === typeof filterValue;
  }
}
