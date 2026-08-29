/**
 * One node of a projected cause chain, shaped as RFC 9457 members.
 *
 * @module
 */

/** One projected cause-chain node. Structurally a cause node, plus head-only `stack`. */
export interface ProjectedNodeInterface {
  /** Human-readable explanation specific to this occurrence. */
  readonly 'detail': string;
  /** Constructor name of the caught value, when it had one. */
  readonly 'name'?: string;
  /** Stack trace. Present on the head node only. */
  readonly 'stack'?: string;
  /** Stable human-readable name of the problem type. */
  readonly 'title': string;
  /** URI reference identifying the problem type. The discriminant. */
  readonly 'type': string;
}
