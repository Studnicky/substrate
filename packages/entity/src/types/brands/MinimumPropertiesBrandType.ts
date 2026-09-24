/**
 * Phantom brand for the `minProperties` JSON Schema constraint keyword.
 * Carries the minimum property count.
 *
 * @module
 */
import type { IdentityType } from '../IdentityType.js';

declare const MINIMUM_PROPERTIES: unique symbol;

export type MinimumPropertiesBrandType<N extends number> = IdentityType<{ [MINIMUM_PROPERTIES]: N }> & object;
