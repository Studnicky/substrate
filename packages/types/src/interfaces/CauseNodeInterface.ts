/**
 * One node of a cause chain, shaped as RFC 9457 members. `type` is the discriminant.
 * `code`, `context`, `correlationId`, and `timestamp` are present when the node was a `BaseError`.
 */
export interface CauseNodeInterface {
  /** Registered dotted error code, when this node was a `BaseError`. */
  readonly 'code'?: string;
  /** Structured metadata carried by this node, when it was a `BaseError`. */
  readonly 'context'?: Readonly<Record<string, unknown>>;
  /** Correlation ID carried by this node, when it was a `BaseError`. */
  readonly 'correlationId'?: string;
  /** Human-readable explanation specific to this occurrence. */
  readonly 'detail': string;
  /** Constructor name of the caught value, when it had one. */
  readonly 'name'?: string;
  /** Construction timestamp carried by this node, when it was a `BaseError`. */
  readonly 'timestamp'?: number;
  /** Stable human-readable name of the problem type. */
  readonly 'title': string;
  /** URI reference identifying the problem type. */
  readonly 'type': string;
}
