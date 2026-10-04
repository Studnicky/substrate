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

/** Current faceted drilldown selection. */

/** Union of all matcher contracts. */
export type MatcherUnionType = AlphabeticMatcherInterface | CidrMatcherInterface | DateMatcherInterface | RangeMatcherInterface | SemverMatcherInterface | SequentialMatcherInterface | StringMatcherInterface;
