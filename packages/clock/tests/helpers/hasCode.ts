/**
 * Type guard: narrows an unknown caught value to one that carries a `code` property.
 *
 * @module
 */

type WithCodeType = object & { readonly code: unknown };

/**
 * Guards against values that carry a `code` property.
 */
export class CodeGuard {
  /** Returns `true` when `value` is a non-null object that has a `code` property. */
  public static has(value: unknown): value is WithCodeType {
    return (
      typeof value === 'object'
      && value !== null
      && 'code' in value
    );
  }
}
