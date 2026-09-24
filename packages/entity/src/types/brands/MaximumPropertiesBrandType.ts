/**
 * Phantom brand for the `maxProperties` JSON Schema constraint keyword.
 * Carries the maximum property count.
 *
 * @module
 */
import type { IdentityType } from '../IdentityType.js';

declare const MAXIMUM_PROPERTIES: unique symbol;

export type MaximumPropertiesBrandType<N extends number> = IdentityType<{ [MAXIMUM_PROPERTIES]: N }> & object;
