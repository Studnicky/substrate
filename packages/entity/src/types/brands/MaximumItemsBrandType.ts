/**
 * Phantom brand for the `maxItems` JSON Schema constraint keyword.
 * Carries the maximum item count.
 *
 * @module
 */
import type { IdentityType } from '../IdentityType.js';

declare const MAXIMUM_ITEMS: unique symbol;

export type MaximumItemsBrandType<N extends number> = IdentityType<{ [MAXIMUM_ITEMS]: N }> & unknown[];
