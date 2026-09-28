/**
 * Phantom brand for the `uniqueItems` JSON Schema constraint keyword.
 * `B` is always the literal `true` — the keyword only ever brands when set.
 *
 * @module
 */
declare const UNIQUE_ITEMS: unique symbol;

export interface UniqueItemsBrandInterface<B extends true> extends Array<unknown> {
  readonly [UNIQUE_ITEMS]: B;
}
