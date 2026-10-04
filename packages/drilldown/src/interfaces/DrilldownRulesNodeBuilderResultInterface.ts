import type { SchemaNodeInterface } from '@studnicky/entity/interfaces';

import type { AlphabeticRangeEntity } from '../entities/AlphabeticRangeEntity.js';
import type { CidrRangeEntity } from '../entities/CidrRangeEntity.js';
import type { DateRangeEntity } from '../entities/DateRangeEntity.js';
import type { FilterRuleEntity } from '../entities/FilterRuleEntity.js';
import type { GroupValueDiscriminantEntity } from '../entities/GroupValueDiscriminantEntity.js';
import type { RangeEntity } from '../entities/RangeEntity.js';
import type { SemverRangeEntity } from '../entities/SemverRangeEntity.js';
import type { SequentialRangeEntity } from '../entities/SequentialRangeEntity.js';
import type { SortRuleEntity } from '../entities/SortRuleEntity.js';

interface DrilldownAlphabeticGroupValueNodeStaticInterface extends AlphabeticRangeEntity.Type {
  readonly 'rules'?: DrilldownRulesNodeStaticInterface;
  readonly 'type': Extract<GroupValueDiscriminantEntity.Type, 'alphabetic'>;
}

interface DrilldownCidrGroupValueNodeStaticInterface extends CidrRangeEntity.Type {
  readonly 'rules'?: DrilldownRulesNodeStaticInterface;
  readonly 'type': Extract<GroupValueDiscriminantEntity.Type, 'cidr'>;
}

interface DrilldownDateGroupValueNodeStaticInterface extends DateRangeEntity.Type {
  readonly 'rules'?: DrilldownRulesNodeStaticInterface;
  readonly 'type': Extract<GroupValueDiscriminantEntity.Type, 'date'>;
}

interface DrilldownRangeGroupValueNodeStaticInterface extends RangeEntity.Type {
  readonly 'rules'?: DrilldownRulesNodeStaticInterface;
  readonly 'type': Extract<GroupValueDiscriminantEntity.Type, 'range'>;
}

interface DrilldownSemverGroupValueNodeStaticInterface extends SemverRangeEntity.Type {
  readonly 'rules'?: DrilldownRulesNodeStaticInterface;
  readonly 'type': Extract<GroupValueDiscriminantEntity.Type, 'semver'>;
}

interface DrilldownSequentialGroupValueNodeStaticInterface {
  readonly 'rules'?: DrilldownRulesNodeStaticInterface;
  readonly 'sequential': SequentialRangeEntity.Type;
  readonly 'type': Extract<GroupValueDiscriminantEntity.Type, 'sequential'>;
}

interface DrilldownStringGroupValueNodeStaticInterface {
  readonly 'match': string;
  readonly 'rules'?: DrilldownRulesNodeStaticInterface;
  readonly 'type': Extract<GroupValueDiscriminantEntity.Type, 'string'>;
}

interface DrilldownGroupRuleNodeStaticInterface {
  readonly 'groupOutliers'?: boolean;
  readonly 'property': string;
  readonly 'values'?: (
    | DrilldownAlphabeticGroupValueNodeStaticInterface
    | DrilldownCidrGroupValueNodeStaticInterface
    | DrilldownDateGroupValueNodeStaticInterface
    | DrilldownRangeGroupValueNodeStaticInterface
    | DrilldownSemverGroupValueNodeStaticInterface
    | DrilldownSequentialGroupValueNodeStaticInterface
    | DrilldownStringGroupValueNodeStaticInterface
  )[];
}

/** Recursion anchor for the top-level rules node's `TStatic`, named here rather than read off `Node` so `Node`'s own inference never has to wait on itself. */
interface DrilldownRulesNodeStaticInterface {
  'filter'?: FilterRuleEntity.Type[];
  'group'?: DrilldownGroupRuleNodeStaticInterface[];
  'sort'?: SortRuleEntity.Type[];
}

/** Node-shape leaf for `DrilldownRulesNodes.ts`'s builder result: neither `DrilldownRulesNodes.ts` nor any group-value entity is imported here, so the nine entities can derive `NodeStaticType<DrilldownRulesNodeBuilderResultInterface['pieces']['x']>` without a value edge back into the recursive builder. */
export interface DrilldownRulesNodeBuilderResultInterface {
  readonly 'filterSort': {
    readonly 'filterRuleNode': SchemaNodeInterface<unknown, FilterRuleEntity.Type>;
    readonly 'sortRuleNode': SchemaNodeInterface<unknown, SortRuleEntity.Type>;
  };
  readonly 'node': SchemaNodeInterface<unknown, DrilldownRulesNodeStaticInterface>;
  readonly 'pieces': {
    readonly 'alphabeticGroupValue': SchemaNodeInterface<unknown, DrilldownAlphabeticGroupValueNodeStaticInterface>;
    readonly 'cidrGroupValue': SchemaNodeInterface<unknown, DrilldownCidrGroupValueNodeStaticInterface>;
    readonly 'dateGroupValue': SchemaNodeInterface<unknown, DrilldownDateGroupValueNodeStaticInterface>;
    readonly 'groupRule': SchemaNodeInterface<unknown, DrilldownGroupRuleNodeStaticInterface>;
    readonly 'groupValue': SchemaNodeInterface<
      unknown,
      | DrilldownAlphabeticGroupValueNodeStaticInterface
      | DrilldownCidrGroupValueNodeStaticInterface
      | DrilldownDateGroupValueNodeStaticInterface
      | DrilldownRangeGroupValueNodeStaticInterface
      | DrilldownSemverGroupValueNodeStaticInterface
      | DrilldownSequentialGroupValueNodeStaticInterface
      | DrilldownStringGroupValueNodeStaticInterface
    >;
    readonly 'rangeGroupValue': SchemaNodeInterface<unknown, DrilldownRangeGroupValueNodeStaticInterface>;
    readonly 'semverGroupValue': SchemaNodeInterface<unknown, DrilldownSemverGroupValueNodeStaticInterface>;
    readonly 'sequentialGroupValue': SchemaNodeInterface<unknown, DrilldownSequentialGroupValueNodeStaticInterface>;
    readonly 'stringGroupValue': SchemaNodeInterface<unknown, DrilldownStringGroupValueNodeStaticInterface>;
  };
}
