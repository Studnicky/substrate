/**
 * @studnicky/drilldown — deterministic multi-level grouping, faceting, and
 * sorting engine that discovers filterable/groupable properties from
 * arbitrary record data.
 *
 * @module
 */

export {
  AlphabeticGroupValueEntity,
  AlphabeticRangeEntity,
  AutoGroupingConfigEntity,
  CidrGroupValueEntity,
  CidrRangeEntity,
  DateGranularityValueEntity,
  DateGroupValueEntity,
  DateRangeEntity,
  DateRangeFilterRuleEntity,
  DiscoverValuesOptionsEntity,
  DiscoveryStrategyEntity,
  FilterOperatorEntity,
  FilterRuleEntity,
  GranularityOptionsEntity,
  GroupingOptionsEntity,
  GroupNodeValueEntity,
  GroupRuleEntity,
  GroupSortPropertyEntity,
  GroupValueDiscriminantEntity,
  GroupValueEntity,
  JsonPropertyTypeEntity,
  NumericRangeFilterRuleEntity,
  OutlierMarkerEntity,
  PathSegmentEntity,
  ProcessOptionsEntity,
  PropertyBoundsEntity,
  PropertyOrderEntity,
  PropertyPathEntity,
  RangeEntity,
  RangeGroupValueEntity,
  RangeIndicesEntity,
  SemverGroupValueEntity,
  SemverRangeEntity,
  SequentialGroupValueEntity,
  SequentialRangeEntity,
  SortDirectionEntity,
  SortRuleEntity,
  StringGroupValueEntity,
  ValueFilterRuleEntity
} from './entities/index.js';
export {
  DateGranularity,
  GroupingStrategy,
  PropertyType
} from './enums.js';
export { DrilldownRulesBuildError } from './errors/DrilldownRulesBuildError.js';
export type {
  DataAnalyzerInterface,
  DrillDownInterface,
  MatcherHandlerInterface
} from './interfaces/index.js';
export type {
  AlphabeticMatcherInterface,
  AnalysisResultInterface,
  CidrMatcherInterface,
  DateMatcherInterface,
  DrillDownAnalysisInterface,
  GroupNodeInterface,
  MatchContextInterface,
  NodePathIndexInterface,
  PartitionGroupInterface,
  PropertyInfoInterface,
  RangeMatcherInterface,
  SemverMatcherInterface,
  SequentialMatcherInterface,
  StringMatcherInterface
} from './interfaces/index.js';
export { DataAnalyzer } from './modules/DataAnalyzer.js';

export { DrillDown } from './modules/DrillDown.js';

export { ruleValidator } from './modules/rules/index.js';

export { DrillDownConfigEntity } from './schema/DrillDownConfigEntity.js';

export { DrilldownRulesEntity } from './schema/DrilldownRulesEntity.js';

export type {
  MatcherUnionType
} from './types/index.js';
