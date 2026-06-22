import type { PatchOpVariantType } from './PatchOpVariantType.js';

/** A single RFC-6902 patch operation. */
export type PatchOperationType = {
  readonly 'from'?: string;
  readonly 'op': PatchOpVariantType;
  readonly 'path': string;
  readonly 'value'?: unknown;
};
