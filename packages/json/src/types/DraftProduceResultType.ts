import type { PatchOperationType } from './PatchOperationType.js';

/** Result of `Draft.producePatch` — the produced value and the RFC-6902 patch that created it. */
export type DraftProduceResultType<T> = {
  'next': T;
  'patch': PatchOperationType[];
};
