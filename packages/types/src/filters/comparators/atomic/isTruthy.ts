/**
 * Checks if a value is truthy (converts to true in boolean context)
 */


export class IsTruthy {
  static isTruthy(value: unknown): boolean   {
    const result = Boolean(value) === true;
    return result;
  }
}
