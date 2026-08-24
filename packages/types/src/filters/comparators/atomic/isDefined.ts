/**
 * Checks if a value is defined (not undefined)
 */


export class IsDefined {
  static isDefined(value: unknown): boolean   {
    return value !== undefined;
  }
}
