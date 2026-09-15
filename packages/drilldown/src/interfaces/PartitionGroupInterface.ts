import type { GroupNodeValueEntity } from '../entities/GroupNodeValueEntity.js';
import type { DrilldownRulesEntity } from '../schema/DrilldownRulesEntity.js';

/** Intermediate structure holding records assigned to a specific group. Carries arbitrary record data, not schema data. */
export interface PartitionGroupInterface {
  'groupValue': DrilldownRulesEntity.GroupValueEntity.Type
  'nodes': Record<string, unknown>[]
  'nodeValue': GroupNodeValueEntity.Type
}
