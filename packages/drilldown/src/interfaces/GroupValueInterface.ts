import type { AlphabeticRangeEntity } from '../entities/AlphabeticRangeEntity.js';
import type { CidrRangeEntity } from '../entities/CidrRangeEntity.js';
import type { DateRangeEntity } from '../entities/DateRangeEntity.js';
import type { GroupValueDiscriminantEntity } from '../entities/GroupValueDiscriminantEntity.js';
import type { RangeEntity } from '../entities/RangeEntity.js';
import type { SemverRangeEntity } from '../entities/SemverRangeEntity.js';
import type { SequentialRangeEntity } from '../entities/SequentialRangeEntity.js';
import type { DrilldownRulesEntity } from '../schema/DrilldownRulesEntity.js';
import type { GroupValueUnionType } from '../types/index.js';

export interface AlphabeticGroupValueInterface extends Readonly<AlphabeticRangeEntity.Type> {
  readonly 'rules'?: DrilldownRulesEntity.Type;
  readonly 'type': Extract<GroupValueDiscriminantEntity.Type, 'alphabetic'>;
}

export interface CidrGroupValueInterface extends Readonly<CidrRangeEntity.Type> {
  readonly 'rules'?: DrilldownRulesEntity.Type;
  readonly 'type': Extract<GroupValueDiscriminantEntity.Type, 'cidr'>;
}

export interface DateGroupValueInterface extends Readonly<DateRangeEntity.Type> {
  readonly 'rules'?: DrilldownRulesEntity.Type;
  readonly 'type': Extract<GroupValueDiscriminantEntity.Type, 'date'>;
}

export interface GroupRuleInterface {
  readonly 'groupOutliers'?: boolean;
  readonly 'property': string;
  readonly 'values'?: GroupValueUnionType[];
}

export interface RangeGroupValueInterface extends Readonly<RangeEntity.Type> {
  readonly 'rules'?: DrilldownRulesEntity.Type;
  readonly 'type': Extract<GroupValueDiscriminantEntity.Type, 'range'>;
}

export interface SemverGroupValueInterface extends Readonly<SemverRangeEntity.Type> {
  readonly 'rules'?: DrilldownRulesEntity.Type;
  readonly 'type': Extract<GroupValueDiscriminantEntity.Type, 'semver'>;
}

export interface SequentialGroupValueInterface {
  readonly 'rules'?: DrilldownRulesEntity.Type;
  readonly 'sequential': SequentialRangeEntity.Type;
  readonly 'type': Extract<GroupValueDiscriminantEntity.Type, 'sequential'>;
}

export interface StringGroupValueInterface {
  readonly 'match': string;
  readonly 'rules'?: DrilldownRulesEntity.Type;
  readonly 'type': Extract<GroupValueDiscriminantEntity.Type, 'string'>;
}
