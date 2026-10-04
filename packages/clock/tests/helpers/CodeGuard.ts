/**
 * Type guard: narrows an unknown caught value to one that carries a `code` property.
 *
 * @module
 */

/** An error that carries a string `code`. */
interface WithCodeInterface extends Error {
  readonly 'code': string;
}

/**
 * Guards against values that carry a `code` property.
 */
export class CodeGuard {
  /** Returns `true` when `value` is a non-null object that has a `code` property. */
  public static has(value: Error): value is WithCodeInterface {
    const carriesCode = 'code' in value;
    return carriesCode;
  }
}
