import type { PatchOpVariantType } from './PatchOpVariantType.js';

// json-schema-uninexpressible: 'value' is unknown, since a patch operand may be any arbitrary JSON value — unknown cannot be expressed in JSON Schema
/** A single RFC-6902 patch operation. */
export type PatchOperationType = {
  'from'?: string;
  'op': PatchOpVariantType;
  'path': string;
  'value'?: unknown;
};
