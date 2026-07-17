import type { PatchOperationType } from './PatchOperationType.js';

// json-schema-uninexpressible: generic type parameter T used directly in the shape — generics cannot be expressed in JSON Schema
/** Result of `Draft.producePatch` — the produced value and the RFC-6902 patch that created it. */
export type DraftProduceResultType<T> = {
  'next': T;
  'patch': PatchOperationType[];
};
