/**
 * Abstract root of the error class hierarchy.
 * Every thrown error in this codebase extends `BaseError`.
 *
 * Property write order (V8 monomorphism — written immediately after super()):
 *   1. `name`          (shadows `Error.prototype.name`)
 *   2. `code`
 *   3. `metadata`
 *   4. `timestamp`
 *   5. `correlationId`
 *   6. `retryable`
 *
 * (`message` and `cause` are written by the `Error` super-constructor.)
 *
 * @module
 */
import type { JsonValueType } from '@studnicky/types';

import type { BaseErrorArgumentsType } from '../types/BaseErrorArgumentsType.js';
import type { SerializedErrorType } from '../types/SerializedErrorType.js';

import {
  CAUSE_CHAIN_DEPTH_LIMIT,
  CAUSE_DEPTH_SENTINEL
} from '../constants/CauseChainConstants.js';

/**
 * Abstract base class for all errors in the system.
 * Subclasses must call `super(args)` and register their code via `ErrorCodeRegistry`.
 */
export abstract class BaseError extends Error {
  /** Registered error code (dotted camelCase, e.g. `'errors.validationFailed'`). */
  public readonly code: string;
  /** Optional correlation ID for distributed tracing. */
  public readonly correlationId: string | undefined;
  /** Structured metadata dictionary attached to this error instance. */
  public readonly metadata: Readonly<Record<string, JsonValueType>> | undefined;
  /** Whether this error represents a transient condition that may succeed on retry. */
  public readonly retryable: boolean;
  /** Unix millisecond timestamp at time of construction. */
  public readonly timestamp: number;

  protected constructor(args: Readonly<BaseErrorArgumentsType>) {
    super(args.message, { 'cause': args.cause });
    // Property write order: name first (shadows Error.prototype.name).
    this.name = new.target.name;
    this.code = args.code;
    const metaEntries = args.metadata !== undefined ? Object.entries(args.metadata) : [];
    const meta: Record<string, JsonValueType> = Object.fromEntries(metaEntries);
    this.metadata = metaEntries.length > 0 ? Object.freeze(meta) : undefined;
    this.timestamp = Date.now();
    this.correlationId = args.correlationId;
    this.retryable = args.retryable ?? false;
  }

  /**
   * Finds the first cause of a specific `BaseError` subclass in the cause chain.
   * Returns `undefined` if not found.
   */
  public static findCauseOfType<TError extends BaseError>(
    error: Readonly<BaseError>,
    ctor: new (...argumentList: never[]) => TError
  ): TError | undefined {
    let current: unknown = error;
    let depth = 0;

    while (current !== undefined && current !== null && depth < CAUSE_CHAIN_DEPTH_LIMIT) {
      if (current instanceof ctor) {
        return current;
      }
      if (current instanceof Error) {
        current = current.cause;
      } else {
        break;
      }
      depth++;
    }

    return undefined;
  }

  /**
   * Returns the full cause chain as a flat readonly array.
   * The first element is `error`; subsequent elements are causes.
   */
  public static getCauseChain(error: Readonly<BaseError>): readonly unknown[] {
    const chain: unknown[] = [];
    let current: unknown = error;
    let depth = 0;

    while (current !== undefined && current !== null && depth < CAUSE_CHAIN_DEPTH_LIMIT) {
      chain.push(current);
      if (current instanceof Error) {
        current = current.cause;
      } else {
        break;
      }
      depth++;
    }

    return chain;
  }

  /**
   * Returns `true` if any node in the cause chain is an instance of `ctor`.
   */
  public static hasCauseOfType(
    error: Readonly<BaseError>,
    ctor: new (...argumentList: never[]) => BaseError
  ): boolean {
    let current: unknown = error;
    let depth = 0;

    while (current !== undefined && current !== null && depth < CAUSE_CHAIN_DEPTH_LIMIT) {
      if (current instanceof ctor) {
        return true;
      }
      if (current instanceof Error) {
        current = current.cause;
      } else {
        break;
      }
      depth++;
    }

    return false;
  }

  /**
   * Returns the `message` of any error-like value as a string.
   * Used to safely interpolate caught `unknown` errors into messages.
   */
  public static toMessage(err: unknown): string {
    if (err instanceof Error) {
      return err.message;
    }
    return String(err);
  }

  /** Serializes a single cause node at the given depth. */
  protected static serializeCause(error: unknown, depth: number): SerializedErrorType {
    if (error instanceof BaseError) {
      const causeRaw = error.cause;
      let causeValue: SerializedErrorType | string | null = null;

      if (causeRaw !== undefined && causeRaw !== null) {
        if (depth >= CAUSE_CHAIN_DEPTH_LIMIT) {
          causeValue = CAUSE_DEPTH_SENTINEL;
        } else {
          causeValue = BaseError.serializeCause(causeRaw, depth + 1);
        }
      }

      return {
        'cause': causeValue,
        'code': error.code,
        'context': error.metadata,
        'correlationId': error.correlationId ?? null,
        'message': error.message,
        'timestamp': error.timestamp
      };
    }

    if (error instanceof Error) {
      const causeRaw = error.cause;
      let causeValue: SerializedErrorType | string | null = null;

      if (causeRaw !== undefined && causeRaw !== null) {
        if (depth >= CAUSE_CHAIN_DEPTH_LIMIT) {
          causeValue = CAUSE_DEPTH_SENTINEL;
        } else {
          causeValue = BaseError.serializeCause(causeRaw, depth + 1);
        }
      }

      return {
        'cause': causeValue,
        'code': 'native.error',
        'context': undefined,
        'correlationId': null,
        'message': error.message,
        'timestamp': 0
      };
    }

    // Primitive cause (string, number, etc.).
    return {
      'cause': null,
      'code': 'native.primitive',
      'context': undefined,
      'correlationId': null,
      'message': String(error),
      'timestamp': 0
    };
  }

  /**
   * Returns extra fields to merge into the `toJSON()` output.
   * Override in subclasses to inject additional serialized properties without
   * rewriting cause-chain logic.
   *
   * Fire-point: called from `toJSON()` after the base serialization object is built.
   * `super.serializeExtra()` need not be called — the default returns `{}`.
   */
  protected serializeExtra(): Record<string, unknown> {
    const extra: Record<string, unknown> = {};
    return extra;
  }

  /**
   * Formats the user-facing message string.
   * Override in subclasses to provide domain-specific formatting.
   * Fire-point: called from `toUserMessage()`.
   * `super.formatUserMessage()` need not be called — the default returns `this.message`.
   */
  protected formatUserMessage(): string {
    const message: string = this.message;
    return message;
  }

  /**
   * Serializes this error (and its cause chain) to a plain JSON-compatible object.
   * Circular cause chains are truncated at `CAUSE_CHAIN_DEPTH_LIMIT`.
   * Every field is always present; absent optional fields use `null` or `undefined`.
   *
   * Returns `Record<string, unknown>` so subclasses may override with richer
   * serialization while still satisfying the base contract.
   */
  public toJSON(): Record<string, unknown> {
    const base = BaseError.serializeCause(this, 0) as unknown as Record<string, unknown>;
    const extra = this.serializeExtra();
    return { ...base, ...extra };
  }

  /**
   * Serializes this error to a `SerializedErrorType` object.
   * Equivalent to `toJSON()` with the precise return type.
   */
  public toSerializedError(): SerializedErrorType {
    const result = BaseError.serializeCause(this, 0);
    return result;
  }

  /**
   * Returns a user-facing message string suitable for display.
   * Delegates to `formatUserMessage()` — override that method in subclasses.
   */
  public toUserMessage(): string {
    const result = this.formatUserMessage();
    return result;
  }
}
