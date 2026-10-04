/**
 * Phantom brand for the `exclusiveMaximum` JSON Schema constraint keyword.
 * Carries the exclusive upper bound.
 *
 * @module
 */
import type { IdentityType } from '../IdentityType.js';

declare const EXCLUSIVE_MAXIMUM: unique symbol;

export type ExclusiveMaximumBrandType<N extends number> = IdentityType<{ [EXCLUSIVE_MAXIMUM]: N }> & number;
