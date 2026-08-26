/**
 * Checks if a value is not null
 */


export class IsNotNull {
  static isNotNull(value: unknown): boolean   {
    const result = value !== null;
    return result;
  }
}
