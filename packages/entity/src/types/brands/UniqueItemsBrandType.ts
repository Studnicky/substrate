/**
 * Phantom brand for the `uniqueItems` JSON Schema constraint keyword.
 * `B` is always the literal `true` — the keyword only ever brands when set.
 *
 * @module
 */
import type { IdentityType } from '../IdentityType.js';

declare const UNIQUE_ITEMS: unique symbol;

export type UniqueItemsBrandType<B extends true> = IdentityType<{ [UNIQUE_ITEMS]: B }> & unknown[];
