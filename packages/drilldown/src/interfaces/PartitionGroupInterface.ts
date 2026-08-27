import type { GroupNodeValueEntity } from '../entities/GroupNodeValueEntity.js';
import type { GroupValueUnionType } from '../types/index.js';
import type { DataRecordInterface } from './DataRecordInterface.js';

/** Intermediate structure holding records assigned to a specific group. Carries arbitrary record data, not schema data. */
export interface PartitionGroupInterface {
  'groupValue': GroupValueUnionType
  'nodes': DataRecordInterface[]
  'nodeValue': GroupNodeValueEntity.Type
}
