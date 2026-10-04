import type { CauseNodeInterface } from './CauseNodeInterface.js';

/**
 * Total projection of an arbitrary caught value into RFC 9457 members. The three core
 * members are always present; `causes` carries the bounded, cycle-safe remainder of the
 * cause chain and `stack` is carried by the head only.
 */
export interface ThrownValueInterface {
  /** Bounded, cycle-safe projection of the remainder of the cause chain (excludes this node). */
  readonly 'causes'?: readonly CauseNodeInterface[];
  /** Human-readable explanation specific to this occurrence. */
  readonly 'detail': string;
  /** Constructor name of the caught value, when it had one. */
  readonly 'name'?: string;
  /** Stack trace of the head node. Cause nodes carry none. */
  readonly 'stack'?: string;
  /** Stable human-readable name of the problem type. */
  readonly 'title': string;
  /** URI reference identifying the problem type. */
  readonly 'type': string;
}
