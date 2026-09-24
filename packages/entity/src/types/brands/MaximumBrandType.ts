/**
 * Phantom brand for the `maximum` JSON Schema constraint keyword.
 * Carries the inclusive upper bound.
 *
 * @module
 */
import type { IdentityType } from '../IdentityType.js';

declare const MAXIMUM: unique symbol;

export type MaximumBrandType<N extends number> = IdentityType<{ [MAXIMUM]: N }> & number;
