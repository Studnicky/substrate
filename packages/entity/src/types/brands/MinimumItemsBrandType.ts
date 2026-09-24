/**
 * Phantom brand for the `minItems` JSON Schema constraint keyword.
 * Carries the minimum item count.
 *
 * @module
 */
import type { IdentityType } from '../IdentityType.js';

declare const MINIMUM_ITEMS: unique symbol;

export type MinimumItemsBrandType<N extends number> = IdentityType<{ [MINIMUM_ITEMS]: N }> & unknown[];
