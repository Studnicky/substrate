/**
 * Resolves a `$ref` IRI against the ambient `EntityReferenceRegistryInterface`
 * registry, deriving the registered type at compile time instead of
 * `unknown`. Unaugmented or unregistered IRIs resolve to `ReferenceNotFoundType`.
 * @module
 */
import type { EntityReferenceRegistryInterface } from '../../interfaces/EntityReferenceRegistryInterface.js';
import type { ReferenceNotFoundType } from './ReferenceNotFoundType.js';

export type ResolveEntityReferenceType<TReference extends string>
  = TReference extends keyof EntityReferenceRegistryInterface
    ? EntityReferenceRegistryInterface[TReference]
    : ReferenceNotFoundType<TReference>;
