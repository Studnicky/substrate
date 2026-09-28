/**
 * Phantom brand for the `pattern` JSON Schema constraint keyword.
 * Carries the regex pattern literal.
 *
 * @module
 */
import type { IdentityType } from '../IdentityType.js';

declare const PATTERN: unique symbol;

export type PatternBrandType<P extends string> = IdentityType<{ [PATTERN]: P }> & string;
