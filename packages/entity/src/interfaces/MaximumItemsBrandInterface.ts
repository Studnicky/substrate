/**
 * Phantom brand for the `maxItems` JSON Schema constraint keyword.
 * Carries the maximum item count.
 *
 * @module
 */
declare const MAXIMUM_ITEMS: unique symbol;

export interface MaximumItemsBrandInterface<N extends number> extends Array<unknown> {
  readonly [MAXIMUM_ITEMS]: N;
}
