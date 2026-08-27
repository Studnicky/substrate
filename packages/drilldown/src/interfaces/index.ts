import type { GroupingOptionsEntity } from '../entities/GroupingOptionsEntity.js';
import type { GroupNodeValueEntity } from '../entities/GroupNodeValueEntity.js';
import type { GroupValueDiscriminantEntity } from '../entities/GroupValueDiscriminantEntity.js';
import type { PathSegmentEntity } from '../entities/PathSegmentEntity.js';
import type { DrillDownConfigEntity } from '../schema/DrillDownConfigEntity.js';
import type { FacetAccessorMapType, FacetFilterStateType, GroupValueUnionType, MatcherUnionType } from '../types/index.js';
import type { AnalysisResultInterface } from './AnalysisResultInterface.js';
import type { DataRecordInterface } from './DataRecordInterface.js';
import type { DrillDownAnalysisInterface } from './DrillDownAnalysisInterface.js';
import type { GroupNodeInterface } from './GroupNodeInterface.js';
import type { PartitionGroupInterface } from './PartitionGroupInterface.js';

export type { AnalysisResultInterface } from './AnalysisResultInterface.js';
export type { DataRecordInterface } from './DataRecordInterface.js';
export type { DrillDownAnalysisInterface } from './DrillDownAnalysisInterface.js';
export type { GroupNodeInterface } from './GroupNodeInterface.js';
export type { AlphabeticMatcherInterface, CidrMatcherInterface, DateMatcherInterface, RangeMatcherInterface, SemverMatcherInterface, SequentialMatcherInterface, StringMatcherInterface } from './MatcherInterface.js';
export type { PartitionGroupInterface } from './PartitionGroupInterface.js';
export type { PropertyInfoInterface } from './PropertyInfoInterface.js';

/**
 * Context providing type conversion utilities for matching operations.
 */
export interface MatchContextInterface {
  toDateTimestamp(value: unknown): null | number
  toStrictNumber(value: unknown): null | number
}

/**
 * Bidirectional index for efficient node lookup in the grouping tree.
 */
export interface NodePathIndexInterface {
  entries(): [PathSegmentEntity.Type[], GroupNodeInterface][]
  getNode(path: PathSegmentEntity.Type[]): GroupNodeInterface | null
  getPath(node: GroupNodeInterface): null | PathSegmentEntity.Type[]
}

/**
 * Contract for data analyzers that inspect record characteristics before grouping.
 */
export interface DataAnalyzerInterface {
  analyze(data: DataRecordInterface[], options?: GroupingOptionsEntity.Type): AnalysisResultInterface
}

/**
 * Unified recursive multi-level grouping engine combining explicit rules and auto property ordering.
 */
export interface DrillDownInterface {
  analyze(data: DataRecordInterface[], config?: DrillDownConfigEntity.Type): DrillDownAnalysisInterface
  facetOptions<TRecord, TDimension extends string>(
    rows: readonly TRecord[],
    dimensions: readonly TDimension[],
    filter: FacetFilterStateType<TDimension>,
    accessors: FacetAccessorMapType<TRecord, TDimension>,
    dimension: TDimension
  ): ReadonlySet<string>
  group(data: DataRecordInterface[], config?: DrillDownConfigEntity.Type): GroupNodeInterface
  resolveFilterState<TRecord, TDimension extends string>(
    rows: readonly TRecord[],
    dimensions: readonly TDimension[],
    accessors: FacetAccessorMapType<TRecord, TDimension>,
    proposed: FacetFilterStateType<TDimension>,
    changedDimension: TDimension
  ): FacetFilterStateType<TDimension>
}

/**
 * Defines how a specific matcher type processes group values, creates matchers, and matches data.
 * Core extension point for the matching system.
 */
export interface MatcherHandlerInterface<
  TGroupValue extends GroupValueUnionType = GroupValueUnionType,
  TMatcher extends MatcherUnionType = MatcherUnionType,
  TNodeValue extends GroupNodeValueEntity.Type = GroupNodeValueEntity.Type
> {
  compare(a: TNodeValue, b: TNodeValue): number
  createMatcher(valueDef: TGroupValue, group: PartitionGroupInterface): null | TMatcher
  createNodeValue(valueDef: TGroupValue): TNodeValue
  getSortKey?(matcher: TMatcher): number
  isGroupValue(value: GroupValueUnionType): value is TGroupValue
  isNodeValue(value: unknown): value is TNodeValue
  match(matcher: TMatcher, value: unknown, stringValue: string, context: MatchContextInterface): boolean
  mergeIfOverlapping?(first: TGroupValue, second: TGroupValue): null | TGroupValue
  'supportsBinarySearch': boolean
  'type': GroupValueDiscriminantEntity.Type
  validate(valueDef: TGroupValue, path: string): string[]
}
