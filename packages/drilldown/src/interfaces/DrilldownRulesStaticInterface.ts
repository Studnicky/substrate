import type { NodeStaticType } from '@studnicky/entity/types';

import type { GroupRuleEntity } from '../entities/GroupRuleEntity.js';
import type { drilldownRulesNodes } from '../schema/DrilldownRulesNodes.js';

/** Hand-authored recursion anchor for `defineRecursive`'s `TStatic`: `Node`'s inference reads this back through `self`, so it cannot itself be read off `Node`. Every field reads its node directly from `drilldownRulesNodes`/`GroupRuleEntity` rather than through `DrilldownRulesEntity`'s own re-exports — that round trip would make this interface depend on `DrilldownRulesEntity.Node`'s own inferred return type, which depends on this interface. */
export interface DrilldownRulesStaticInterface {
  'filter'?: NodeStaticType<typeof drilldownRulesNodes.filterSort.filterRuleNode>[];
  'group'?: GroupRuleEntity.Type[];
  'sort'?: NodeStaticType<typeof drilldownRulesNodes.filterSort.sortRuleNode>[];
}
