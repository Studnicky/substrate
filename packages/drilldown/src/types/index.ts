import type {
  AlphabeticMatcherInterface,
  CidrMatcherInterface,
  DateMatcherInterface,
  RangeMatcherInterface,
  SemverMatcherInterface,
  SequentialMatcherInterface,
  StringMatcherInterface
} from '../interfaces/MatcherInterface.js';

/** Accessor map for generic faceted drilldown discovery. */
export type FacetAccessorMapType<TRecord, TDimension extends string> = Partial<Record<TDimension, (row: TRecord) => string | null>>;

/** Current faceted drilldown selection. */
export type FacetFilterStateType<TDimension extends string> = Partial<Record<TDimension, ReadonlySet<string> | null>>;

/** Schema-owned union of all group-value variants. */
export type GroupValueUnionType = DrilldownRulesEntity.GroupValueEntity.Type;

/** Union of all matcher contracts. */
export type MatcherUnionType
  = | AlphabeticMatcherInterface
    | CidrMatcherInterface
    | DateMatcherInterface
    | RangeMatcherInterface
    | SemverMatcherInterface
    | SequentialMatcherInterface
    | StringMatcherInterface;
