/**
 * Phantom brand for the `minContains` JSON Schema constraint keyword.
 * Carries the minimum contains-match count.
 *
 * @module
 */
declare const MINIMUM_CONTAINS: unique symbol;

export interface MinimumContainsBrandInterface<N extends number> extends Array<unknown> {
  readonly [MINIMUM_CONTAINS]: N;
}
