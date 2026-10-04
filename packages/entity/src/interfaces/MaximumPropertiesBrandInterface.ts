/**
 * Phantom brand for the `maxProperties` JSON Schema constraint keyword.
 * Carries the maximum property count.
 *
 * @module
 */
declare const MAXIMUM_PROPERTIES: unique symbol;

export interface MaximumPropertiesBrandInterface<N extends number> {
  readonly [MAXIMUM_PROPERTIES]: N;
}
