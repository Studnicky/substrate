/**
 * Phantom brand for the `minContains` JSON Schema constraint keyword.
 * Carries the minimum contains-match count.
 *
 * @module
 */
import type { IdentityType } from '../IdentityType.js';

declare const MINIMUM_CONTAINS: unique symbol;

export type MinimumContainsBrandType<N extends number> = IdentityType<{ [MINIMUM_CONTAINS]: N }> & unknown[];
