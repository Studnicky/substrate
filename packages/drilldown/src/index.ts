/**
 * @studnicky/drilldown — deterministic multi-level grouping, faceting, and
 * sorting engine that discovers filterable/groupable properties from
 * arbitrary record data.
 *
 * @module
 */

export {
  AlphabeticRangeEntity,
  AutoGroupingConfigEntity,
  CidrRangeEntity,
  DateGranularityValueEntity,
  DateRangeEntity,
  DateRangeFilterRuleEntity,
  DiscoverValuesOptionsEntity,
  DiscoveryStrategyEntity,
  FilterOperatorEntity,
  FilterRuleEntity,
  GranularityOptionsEntity,
  GroupingOptionsEntity,
  GroupNodeValueEntity,
  GroupSortPropertyEntity,
  GroupValueDiscriminantEntity,
  JsonPropertyTypeEntity,
  NumericRangeFilterRuleEntity,
  OutlierMarkerEntity,
  PathSegmentEntity,
  ProcessOptionsEntity,
  PropertyBoundsEntity,
  PropertyOrderEntity,
  PropertyPathEntity,
  RangeEntity,
  RangeIndicesEntity,
  SemverRangeEntity,
  SequentialRangeEntity,
  SortDirectionEntity,
  SortRuleEntity,
  ValueFilterRuleEntity
} from './entities/index.js';
export {
  DateGranularity,
  GroupingStrategy,
  PropertyType
} from './enums.js';
export type {
  AlphabeticGroupValueInterface,
  CidrGroupValueInterface,
  DateGroupValueInterface,
  GroupRuleInterface,
  RangeGroupValueInterface,
  SemverGroupValueInterface,
  SequentialGroupValueInterface,
  StringGroupValueInterface
} from './interfaces/GroupValueInterface.js';
export type {
  DataAnalyzerInterface,
  DrillDownInterface,
  MatcherHandlerInterface
} from './interfaces/index.js';
export type {
  AlphabeticMatcherInterface,
  AnalysisResultInterface,
  CidrMatcherInterface,
  DataRecordInterface,
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

export { FacetedDiscovery } from './modules/FacetedDiscovery.js';
export { ruleValidator } from './modules/rules/index.js';

export { DrillDownConfigEntity } from './schema/DrillDownConfigEntity.js';

export { DrilldownRulesEntity } from './schema/DrilldownRulesEntity.js';

export type {
  FacetAccessorMapType,
  FacetFilterStateType,
  GroupValueUnionType,
  MatcherUnionType
} from './types/index.js';
