/**
 * Phantom brand for the `minItems` JSON Schema constraint keyword.
 * Carries the minimum item count.
 *
 * @module
 */
declare const MINIMUM_ITEMS: unique symbol;

export interface MinimumItemsBrandInterface<N extends number> extends Array<unknown> {
  readonly [MINIMUM_ITEMS]: N;
}
