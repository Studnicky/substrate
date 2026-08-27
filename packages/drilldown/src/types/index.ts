import type {
  AlphabeticGroupValueInterface,
  CidrGroupValueInterface,
  DateGroupValueInterface,
  RangeGroupValueInterface,
  SemverGroupValueInterface,
  SequentialGroupValueInterface,
  StringGroupValueInterface
} from '../interfaces/GroupValueInterface.js';
import type {
  AlphabeticMatcherInterface,
  CidrMatcherInterface,
  DateMatcherInterface,
  RangeMatcherInterface,
  SemverMatcherInterface,
  SequentialMatcherInterface,
  StringMatcherInterface
} from '../interfaces/MatcherInterface.js';

/**
 * Accessor map for generic faceted drilldown discovery. Each dimension reads
 * one filterable string value from an arbitrary row shape.
 */
export type FacetAccessorMapType<TRecord, TDimension extends string> = Partial<Record<TDimension, (row: TRecord) => string | null>>;

/**
 * Current faceted drilldown selection. `null` or an absent key means the
 * dimension is unrestricted; a set means only those values pass.
 */
export type FacetFilterStateType<TDimension extends string> = Partial<Record<TDimension, ReadonlySet<string> | null>>;

/** Union of all group-value shapes — a union of contract interfaces, so it establishes no canonical data itself. */
export type GroupValueUnionType
  = | AlphabeticGroupValueInterface
    | CidrGroupValueInterface
    | DateGroupValueInterface
    | RangeGroupValueInterface
    | SemverGroupValueInterface
    | SequentialGroupValueInterface
    | StringGroupValueInterface;

/** Union of all matcher types — a union of contract interfaces, so it establishes no canonical data itself. */
export type MatcherUnionType
  = | AlphabeticMatcherInterface
    | CidrMatcherInterface
    | DateMatcherInterface
    | RangeMatcherInterface
    | SemverMatcherInterface
    | SequentialMatcherInterface
    | StringMatcherInterface;
