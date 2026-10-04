/**
 * Named diagnostic for a `required` entry absent from `properties`.
 * @module
 */
import type { IdentityType } from '../IdentityType.js';

export type MissingRequiredPropertyType<
  TKey extends string,
  TPointer extends string
> = IdentityType<{
  'kind': 'MissingRequiredProperty';
  'pointer': TPointer;
  'property': TKey;
}>;
