/**
 * Named diagnostic for a key present on a candidate value but absent from
 * `properties` under `additionalProperties: false`.
 * @module
 */
import type { IdentityType } from '../IdentityType.js';

export type ExcessPropertyType<
  TKey extends string,
  TPointer extends string
> = IdentityType<{
  'kind': 'ExcessProperty';
  'pointer': TPointer;
  'property': TKey;
}>;
