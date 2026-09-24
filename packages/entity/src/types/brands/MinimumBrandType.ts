/**
 * Phantom brand for the `minimum` JSON Schema constraint keyword.
 * Carries the inclusive lower bound.
 *
 * @module
 */
import type { IdentityType } from '../IdentityType.js';

declare const MINIMUM: unique symbol;

export type MinimumBrandType<N extends number> = IdentityType<{ [MINIMUM]: N }> & number;
