/**
 * Phantom brand for the `maxContains` JSON Schema constraint keyword.
 * Carries the maximum contains-match count.
 *
 * @module
 */
import type { IdentityType } from '../IdentityType.js';

declare const MAXIMUM_CONTAINS: unique symbol;

export type MaximumContainsBrandType<N extends number> = IdentityType<{ [MAXIMUM_CONTAINS]: N }> & unknown[];
