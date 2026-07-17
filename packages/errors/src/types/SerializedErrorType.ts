/**
 * JSON-serializable shape for a serialized error node in a cause chain.
 * Produced by `BaseError.toJSON()`.
 *
 * Every field is always present; absent optional fields use `null`.
 *
 * @module
 */
import type { JsonValueType } from '@studnicky/types';

// json-schema-uninexpressible: self-referential recursive type ('cause' references SerializedErrorType itself) with no established recursive-$ref entity convention in this codebase
/**
 * Recursive type for a serialized error node.
 * The `cause` field references itself to represent a cause chain.
 */
export type SerializedErrorType = {
  /** Serialized cause, or `null` if absent, or sentinel string if chain is truncated. */
  'cause': SerializedErrorType | string | null;
  /** Registered error code string. */
  'code': string;
  /** Structured context dictionary; may be `undefined` when omitted. */
  'context': Readonly<Record<string, JsonValueType>> | undefined;
  /** Correlation ID, or `null` if absent. */
  'correlationId': string | null;
  /** Human-readable error message. */
  'message': string;
  /** Unix millisecond timestamp at time of construction, or `0` for native errors. */
  'timestamp': number;
};
