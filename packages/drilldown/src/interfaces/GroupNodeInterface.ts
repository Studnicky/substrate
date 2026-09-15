import type { GroupNodeValueEntity } from '../entities/GroupNodeValueEntity.js';
import type { PropertyPathEntity } from '../entities/PropertyPathEntity.js';

/** Tree node in the hierarchical grouping structure. Self-referential — not schema-representable. */
export interface GroupNodeInterface {
  'grouped': GroupNodeInterface[] | null
  'property': PropertyPathEntity.Type | null
  'ungrouped': Record<string, unknown>[] | null
  'value': GroupNodeValueEntity.Type
}
