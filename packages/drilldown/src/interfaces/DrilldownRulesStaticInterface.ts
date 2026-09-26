import type { SchemaNodeInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import type { FilterRuleEntity } from '../entities/FilterRuleEntity.js';
import type { SortRuleEntity } from '../entities/SortRuleEntity.js';
import type { DrilldownRulesNodeBuilderResultInterface } from './DrilldownRulesNodeBuilderResultInterface.js';

/** Hand-authored recursion anchor for `defineRecursive`'s `TStatic`: `Node`'s inference reads this back through `self`, so it cannot itself be read off `Node`. `filter`/`sort` name the static type a `filterRuleNode`/`sortRuleNode` would produce without reading it off `drilldownRulesNodes` — `FilterRuleEntity`/`SortRuleEntity` already prove that shape independently of any recursive node. `group` reads the same node-shape leaf `DrilldownRulesNodeBuilderResultInterface` uses, not `GroupRuleEntity.Type` — that entity's own `Node` composes this recursion anchor as its `rules` field, so referencing it here would reopen the cycle. */
export interface DrilldownRulesStaticInterface {
  'filter'?: NodeStaticType<SchemaNodeInterface<unknown, FilterRuleEntity.Type>>[];
  'group'?: NodeStaticType<DrilldownRulesNodeBuilderResultInterface['pieces']['groupRule']>[];
  'sort'?: NodeStaticType<SchemaNodeInterface<unknown, SortRuleEntity.Type>>[];
}
