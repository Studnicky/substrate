/**
 * Checks if a value is falsy (converts to false in boolean context)
 */


export class IsFalsy {
  static isFalsy(value: unknown): boolean   {
    return !value;
  }
}
