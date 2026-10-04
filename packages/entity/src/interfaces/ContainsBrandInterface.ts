/**
 * Phantom brand for the `contains` JSON Schema constraint keyword.
 * Carries the inferred type of the contains sub-schema.
 *
 * @module
 */
declare const CONTAINS: unique symbol;

export interface ContainsBrandInterface<T> {
  readonly [CONTAINS]: T;
}
