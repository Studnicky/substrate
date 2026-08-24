/**
 * Checks if a value is truthy (converts to true in boolean context)
 */


export class IsTruthy {
  static isTruthy(value: unknown): boolean   {
    return Boolean(value);
  }
}
