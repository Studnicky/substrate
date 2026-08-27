import type { GroupNodeValueEntity } from '../entities/GroupNodeValueEntity.js';
import type { PropertyPathEntity } from '../entities/PropertyPathEntity.js';
import type { DataRecordInterface } from './DataRecordInterface.js';

/** Tree node in the hierarchical grouping structure. Self-referential — not schema-representable. */
export interface GroupNodeInterface {
  'grouped': GroupNodeInterface[] | null
  'property': PropertyPathEntity.Type | null
  'ungrouped': DataRecordInterface[] | null
  'value': GroupNodeValueEntity.Type
}
