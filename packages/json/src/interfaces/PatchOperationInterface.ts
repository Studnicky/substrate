import type { JSONSchema7Type } from 'json-schema';

import type { PatchOperationCoreEntity } from '../entities/PatchOperationCoreEntity.js';

/** Read-only RFC-6902 wire operation with a canonical JSON operand. */
export interface PatchOperationInterface extends PatchOperationCoreEntity.Type {
  readonly 'value'?: JSONSchema7Type;
}
