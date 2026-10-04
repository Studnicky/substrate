/**
 * Phantom brand for the `minLength` JSON Schema constraint keyword.
 * Carries the minimum string length.
 *
 * @module
 */
import type { IdentityType } from '../IdentityType.js';

declare const MINIMUM_LENGTH: unique symbol;

export type MinimumLengthBrandType<N extends number> = IdentityType<{ [MINIMUM_LENGTH]: N }> & string;
