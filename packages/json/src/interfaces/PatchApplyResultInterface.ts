import type { PatchApplyResultStatusEntity } from '../entities/PatchApplyResultStatusEntity.js';

/** Result of applying a patch to a target. */
export interface PatchApplyResultInterface {
  'error'?: PatchApplyResultStatusEntity.Type['error'];
  'success': PatchApplyResultStatusEntity.Type['success'];
  'value': unknown;
}
