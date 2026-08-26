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
import type {
  JSONSchema7Object, JSONSchema7Type
} from 'json-schema';

import { JsonValue, Predicates } from '@studnicky/types';

import type { BaseErrorArgumentsInterface } from '../interfaces/BaseErrorArgumentsInterface.js';

import {
  CAUSE_CHAIN_DEPTH_LIMIT,
  CAUSE_DEPTH_SENTINEL
} from '../constants/CauseChainConstants.js';
import { ThrownValueEntity } from '../entities/ThrownValueEntity.js';

/**
 * Abstract base class for all errors in the system.
 * Subclasses call `super(args)` with their stable error code. Built-in package
 * errors register their codes internally to detect definition collisions.
 */
export abstract class BaseError extends Error {
  /** Registered error code (dotted camelCase, e.g. `'errors.validationFailed'`). */
  public readonly code: string;
  /** Optional correlation ID for distributed tracing. */
  public readonly correlationId: string | undefined;
  /** Structured metadata dictionary attached to this error instance. */
  public readonly metadata: Readonly<Record<string, JSONSchema7Type>> | undefined;
  /** Whether this error represents a transient condition that may succeed on retry. */
  public readonly retryable: boolean;
  /** Unix millisecond timestamp at time of construction. */
  public readonly timestamp: number;

  protected constructor(argumentList: Readonly<BaseErrorArgumentsInterface>) {
    // The options object is passed ONLY when a cause exists. `Error` installs an own
    // `cause` when the options object HAS the key, regardless of its value — so
    // `{ 'cause': undefined }` creates an own `cause` holding `undefined`, while omitting
    // the options object entirely does not create the property at all. Both spellings
    // leave `error.cause === undefined`, so no consumer can tell them apart; what differs
    // is that the first forces any subclass wanting a cause-free instance to `delete` the
    // property, which drops that subclass into dictionary mode. Measured at 5,000,000
    // instances: deleting costs 7.2x on property reads (300.6ms vs 41.8ms) and
    // `%HasFastProperties` reports false. Constructing conditionally splits the family
    // into two maps, which measures free (13.8ms bimorphic vs 15.2ms monomorphic) because
    // inline caches stay polymorphic well past two shapes.
    super(argumentList.message, argumentList.cause !== undefined ? { 'cause': argumentList.cause } : undefined);
    // Property write order: name first (shadows Error.prototype.name).
    this.name = new.target.name;
    this.code = argumentList.code;
    const metadataEntries = argumentList.metadata !== undefined ? Object.entries(argumentList.metadata) : [];
    const metadata: Record<string, JSONSchema7Type> = {};
    const metadataEntriesLength = metadataEntries.length;

    for (let entryIndex = 0; entryIndex < metadataEntriesLength; entryIndex += 1) {
      const entry = metadataEntries[entryIndex];

      if (entry === undefined) {
        continue;
      }
      const [
        key,
        value
      ] = entry;

      Reflect.set(metadata, key, JsonValue.from(value));
    }
    this.metadata = metadataEntriesLength > 0 ? Object.freeze(metadata) : undefined;
    this.timestamp = Date.now();
    this.correlationId = argumentList.correlationId;
    this.retryable = argumentList.retryable ?? false;
  }

  /**
   * Finds the first cause of a specific `BaseError` subclass in the cause chain.
   * Returns `undefined` if not found.
   */
  public static findCauseOfType<TError extends Error>(
    error: Readonly<BaseError>,
    ctor: new (...argumentList: never[]) => TError
  ): TError | undefined {
    let current: unknown = error;
    let depth = 0;

    while (!Predicates.isNullish(current) && depth < CAUSE_CHAIN_DEPTH_LIMIT) {
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

    while (!Predicates.isNullish(current) && depth < CAUSE_CHAIN_DEPTH_LIMIT) {
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
    ctor: new (...argumentList: never[]) => Error
  ): boolean {
    let current: unknown = error;
    let depth = 0;

    while (!Predicates.isNullish(current) && depth < CAUSE_CHAIN_DEPTH_LIMIT) {
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
  public static toMessage(error: unknown): string {
    const projection = ThrownValueEntity.intake(error);

    return projection.message;
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
   * Every field is always present; absent optional fields use `null`.
   *
   * Returns `Record<string, unknown>` so subclasses may override with richer
   * serialization while still satisfying the base contract.
   */
  public toJSON(): Record<string, unknown> {
    const base = this.toSerializedError();
    const extra = this.serializeExtra();

    return {
      ...base, ...extra
    };
  }

  /**
   * Serializes this error to the canonical recursive JSON object type.
   * Equivalent to `toJSON()` with the precise return type.
   */
  public toSerializedError(): JSONSchema7Object {
    const causeRaw = this.cause;
    let causeValue: JSONSchema7Type = null;

    if (!Predicates.isNullish(causeRaw)) {
      causeValue = CauseSerializationEntity.intake(causeRaw, 1);
    }

    const result: JSONSchema7Object = {
      'cause': causeValue,
      'code': this.code,
      'context': this.metadata === undefined ? null : { ...this.metadata },
      'correlationId': this.correlationId ?? null,
      'message': this.message,
      'timestamp': this.timestamp
    };

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

/**
 * Serializes a single cause node at the given depth. A `BaseError` cause carries its own
 * `code`/`metadata`/`correlationId`/`timestamp` and is serialized directly from those fields.
 * Anything else — a plain `Error`, an `AggregateError`, or an arbitrary thrown primitive/object
 * — is an open-set shape, so it is parsed through {@link ThrownValueEntity} rather than hand-rolled
 * `instanceof` branching.
 */
namespace CauseSerializationEntity {
  class Intake {
    static intake(error: unknown, depth: number): JSONSchema7Object {
      if (error instanceof BaseError) {
        const causeRaw = error.cause;
        let causeValue: JSONSchema7Type = null;

        if (!Predicates.isNullish(causeRaw)) {
          if (depth >= CAUSE_CHAIN_DEPTH_LIMIT) {
            causeValue = CAUSE_DEPTH_SENTINEL;
          } else {
            causeValue = Intake.intake(causeRaw, depth + 1);
          }
        }

        return {
          'cause': causeValue,
          'code': error.code,
          'context': error.metadata === undefined ? null : { ...error.metadata },
          'correlationId': error.correlationId ?? null,
          'message': error.message,
          'timestamp': error.timestamp
        };
      }

      const projection = ThrownValueEntity.intake(error);
      const causeRaw = error instanceof Error ? error.cause : undefined;
      let causeValue: JSONSchema7Type = null;

      if (!Predicates.isNullish(causeRaw)) {
        if (depth >= CAUSE_CHAIN_DEPTH_LIMIT) {
          causeValue = CAUSE_DEPTH_SENTINEL;
        } else {
          causeValue = Intake.intake(causeRaw, depth + 1);
        }
      }

      const code = projection.kind === 'error' || projection.kind === 'aggregate' ? 'native.error' : 'native.primitive';

      return {
        'cause': causeValue,
        'code': code,
        'context': null,
        'correlationId': null,
        'message': projection.message,
        'timestamp': 0
      };
    }
  }

  export const intake = Intake.intake;
}
