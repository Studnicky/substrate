/**
 * Phantom brand for the `format` JSON Schema constraint keyword.
 * Carries the format literal so different formats are incompatible.
 *
 * @module
 */
import type { IdentityType } from '../IdentityType.js';

declare const FORMAT: unique symbol;

export type FormatBrandType<F extends string> = IdentityType<{ [FORMAT]: F }> & string;
