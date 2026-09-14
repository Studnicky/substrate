import type {
  AlphabeticMatcherInterface,
  CidrMatcherInterface,
  DateMatcherInterface,
  RangeMatcherInterface,
  SemverMatcherInterface,
  SequentialMatcherInterface,
  StringMatcherInterface
} from '../interfaces/MatcherInterface.js';

export type FacetAccessorMapType<TRecord, TDimension extends string> = Partial<Record<TDimension, (row: TRecord) => string | null>>;
export type FacetFilterStateType<TDimension extends string> = Partial<Record<TDimension, ReadonlySet<string> | null>>;
export type MatcherUnionType = AlphabeticMatcherInterface | CidrMatcherInterface | DateMatcherInterface | RangeMatcherInterface | SemverMatcherInterface | SequentialMatcherInterface | StringMatcherInterface;
