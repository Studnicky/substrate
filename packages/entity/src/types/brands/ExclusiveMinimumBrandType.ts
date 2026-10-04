/**
 * Phantom brand for the `exclusiveMinimum` JSON Schema constraint keyword.
 * Carries the exclusive lower bound.
 *
 * @module
 */
import type { IdentityType } from '../IdentityType.js';

declare const EXCLUSIVE_MINIMUM: unique symbol;

export type ExclusiveMinimumBrandType<N extends number> = IdentityType<{ [EXCLUSIVE_MINIMUM]: N }> & number;
