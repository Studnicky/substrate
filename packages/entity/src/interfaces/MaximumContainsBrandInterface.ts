/**
 * Phantom brand for the `maxContains` JSON Schema constraint keyword.
 * Carries the maximum contains-match count.
 *
 * @module
 */
declare const MAXIMUM_CONTAINS: unique symbol;

export interface MaximumContainsBrandInterface<N extends number> extends Array<unknown> {
  readonly [MAXIMUM_CONTAINS]: N;
}
