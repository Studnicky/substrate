/**
 * Named diagnostic for a `$ref` IRI absent from `EntityReferenceRegistryInterface`.
 * @module
 */
import type { IdentityType } from '../IdentityType.js';

export type ReferenceNotFoundType<TReference extends string> = IdentityType<{
  'kind': 'ReferenceNotFound';
  'unresolvedReference': TReference;
}>;
