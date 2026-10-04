/**
 * Phantom brand for the `multipleOf` JSON Schema constraint keyword.
 * Carries the required divisor.
 *
 * @module
 */
import type { IdentityType } from '../IdentityType.js';

declare const MULTIPLE_OF: unique symbol;

export type MultipleOfBrandType<N extends number> = IdentityType<{ [MULTIPLE_OF]: N }> & number;
