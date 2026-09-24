import type { InvariantFunctionInterface } from '../interfaces/InvariantFunctionInterface.js';
import type { IdentityType } from './IdentityType.js';

/**
 * A named cross-field invariant check with a JSON Pointer error location.
 *
 * @module
 */
export type InvariantType<T = unknown> = IdentityType<{
  'check': InvariantFunctionInterface<T>;
  'name': string;
  'pointer': string;
}>;
