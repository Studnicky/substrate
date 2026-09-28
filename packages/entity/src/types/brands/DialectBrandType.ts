/**
 * Phantom brand for the `$schema` JSON Schema constraint keyword.
 * Carries the dialect URI so schemas against different meta-schemas are incompatible.
 *
 * @module
 */
import type { IdentityType } from '../IdentityType.js';

declare const DIALECT: unique symbol;

export type DialectBrandType<D extends string> = IdentityType<{ [DIALECT]: D }> & string;
