import type { SchemaNodeInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import type { FilterRuleEntity } from '../entities/FilterRuleEntity.js';
import type { GroupRuleEntity } from '../entities/GroupRuleEntity.js';
import type { SortRuleEntity } from '../entities/SortRuleEntity.js';

/** Hand-authored recursion anchor for `defineRecursive`'s `TStatic`: `Node`'s inference reads this back through `self`, so it cannot itself be read off `Node`. `filter`/`sort` name the static type a `filterRuleNode`/`sortRuleNode` would produce without reading it off `drilldownRulesNodes` — `FilterRuleEntity`/`SortRuleEntity` already prove that shape independently of any recursive node. */
export interface DrilldownRulesStaticInterface {
  'filter'?: NodeStaticType<SchemaNodeInterface<unknown, FilterRuleEntity.Type>>[];
  'group'?: GroupRuleEntity.Type[];
  'sort'?: NodeStaticType<SchemaNodeInterface<unknown, SortRuleEntity.Type>>[];
}
