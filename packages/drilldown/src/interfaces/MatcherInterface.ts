import type { PartitionGroupInterface } from './PartitionGroupInterface.js';

// Every member is `readonly` — matchers are declarative, constructed once by a handler and
// never mutated — which is what supplies these otherwise pure-data shapes' contract signal
// (a comprehensive readonly access policy), matching the group-value interfaces' own pattern.

/** Matcher for alphabetic range membership. */
export interface AlphabeticMatcherInterface {
  readonly 'end': string
  readonly 'group': PartitionGroupInterface
  readonly 'start': string
}

/** Matcher for IP address CIDR block membership. */
export interface CidrMatcherInterface {
  readonly 'end': number
  readonly 'group': PartitionGroupInterface
  readonly 'start': number
}

/** Matcher for date/time range membership. */
export interface DateMatcherInterface {
  readonly 'afterTs': number
  readonly 'beforeTs': number
  readonly 'group': PartitionGroupInterface
}

/** Matcher for numeric range membership. */
export interface RangeMatcherInterface {
  readonly 'group': PartitionGroupInterface
  readonly 'maximum': number
  readonly 'minimum': number
}

/** Matcher for semantic version constraint satisfaction. */
export interface SemverMatcherInterface {
  readonly 'group': PartitionGroupInterface
  readonly 'range': string
}

/** Matcher for sequential string patterns. */
export interface SequentialMatcherInterface {
  readonly 'group': PartitionGroupInterface
  readonly 'maximum': number
  readonly 'minimum': number
  readonly 'prefix': string
  readonly 'suffix': string
}

/** Matcher for exact string equality. */
export interface StringMatcherInterface {
  readonly 'group': PartitionGroupInterface
  readonly 'match': string
}
