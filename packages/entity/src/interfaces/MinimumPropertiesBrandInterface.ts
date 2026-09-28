/**
 * Phantom brand for the `minProperties` JSON Schema constraint keyword.
 * Carries the minimum property count.
 *
 * @module
 */
declare const MINIMUM_PROPERTIES: unique symbol;

export interface MinimumPropertiesBrandInterface<N extends number> {
  readonly [MINIMUM_PROPERTIES]: N;
}
