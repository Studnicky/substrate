/**
 * A caller-supplied cross-field invariant check: returns an error message, or
 * `undefined` when the value satisfies the invariant.
 *
 * @module
 */
export interface InvariantFunctionInterface<T = unknown> {
  (value: T): string | undefined;
  readonly 'invariantFunctionBrand'?: unique symbol;
}
