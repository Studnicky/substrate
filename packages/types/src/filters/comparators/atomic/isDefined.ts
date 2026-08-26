/**
 * Checks if a value is defined (not undefined)
 */


export class IsDefined {
  static isDefined(value: unknown): boolean   {
    const result = value !== undefined;
    return result;
  }
}
