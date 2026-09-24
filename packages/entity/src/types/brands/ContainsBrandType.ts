/**
 * Phantom brand for the `contains` JSON Schema constraint keyword.
 * Carries the inferred type of the contains sub-schema.
 *
 * @module
 */
import type { IdentityType } from '../IdentityType.js';

declare const CONTAINS: unique symbol;

export type ContainsBrandType<T> = IdentityType<{ [CONTAINS]: T }>;
