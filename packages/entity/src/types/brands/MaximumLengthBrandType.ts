/**
 * Phantom brand for the `maxLength` JSON Schema constraint keyword.
 * Carries the maximum string length.
 *
 * @module
 */
import type { IdentityType } from '../IdentityType.js';

declare const MAXIMUM_LENGTH: unique symbol;

export type MaximumLengthBrandType<N extends number> = IdentityType<{ [MAXIMUM_LENGTH]: N }> & string;
