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
 *   7. `status`
 *   8. `instance`
 *
 * (`message` and `cause` are written by the `Error` super-constructor.)
 *
 * @module
 */
import type { JSONSchema7Type } from 'json-schema';

import { JsonValue, Predicates } from '@studnicky/types';

import type { CauseNodeEntity } from '../entities/CauseNodeEntity.js';
import type { ProblemDetailsEntity } from '../entities/ProblemDetailsEntity.js';
import type { BaseErrorArgumentsInterface } from '../interfaces/BaseErrorArgumentsInterface.js';

import {
  CAUSE_CHAIN_DEPTH_LIMIT,
  CAUSE_DEPTH_SENTINEL
} from '../constants/CauseChainConstants.js';
import { PROBLEM_TYPE_BASE } from '../constants/ProblemConstants.js';
import { ThrownValueProjection } from '../validation/thrownValueProjection.js';

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
  /** RFC 9457 `instance`: URI reference identifying this specific occurrence. */
  public readonly instance: string | undefined;
  /** Structured metadata dictionary attached to this error instance. */
  public readonly metadata: Readonly<Record<string, JSONSchema7Type>> | undefined;
  /** Whether this error represents a transient condition that may succeed on retry. */
  public readonly retryable: boolean;
  /** RFC 9457 `status`: HTTP status code an origin server would generate for this occurrence. */
  public readonly status: number | undefined;
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
    this.status = argumentList.status;
    this.instance = argumentList.instance;
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
      if (Predicates.isError(current)) {
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
      if (Predicates.isError(current)) {
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
      if (Predicates.isError(current)) {
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
    const projection = ThrownValueProjection.project(error);

    return projection.detail;
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
   * Problem type URI identifying what KIND of failure this is — RFC 9457's discriminant.
   * Defaults to the workspace problem namespace joined with the registered code, so
   * `errors.validationFailed` becomes `https://problems.studnicky.dev/errors.validationFailed`.
   * Override to point at published documentation for a specific problem type.
   */
  protected problemType(): string {
    const result = `${PROBLEM_TYPE_BASE}${this.code}`;

    return result;
  }

  /**
   * Serializes this error and its cause chain as an RFC 9457 Problem Details object.
   * This is the one serialized form; `JSON.stringify` reaches it through the same method.
   *
   * Member mapping, and why each lands where it does:
   * - `type`    — {@link problemType}. The discriminant; stable per problem type.
   * - `title`   — the class name. §3.1.2 requires a title that does NOT vary per occurrence.
   * - `detail`  — `message`. §3.1.4 is explicit that detail IS occurrence-specific.
   * - `status`  — only when the error carries one; §3.1 leaves every member optional.
   * - `instance`— only when the error carries one.
   *
   * Everything else is an extension member (§3.2): `code`, `correlationId`, `timestamp`,
   * `retryable`, `context`, `stack`, and the flattened `causes` chain. Absent values are
   * omitted rather than emitted as `null`, so a consumer testing member presence is right.
   */
  public toJSON(): ProblemDetailsEntity.Type {
    const problem: Record<string, unknown> = {
      'code': this.code,
      'detail': this.message,
      'retryable': this.retryable,
      'timestamp': this.timestamp,
      'title': this.name,
      'type': this.problemType()
    };

    if (this.status !== undefined) { problem.status = this.status; }
    if (this.instance !== undefined) { problem.instance = this.instance; }
    if (this.correlationId !== undefined) { problem.correlationId = this.correlationId; }
    if (this.metadata !== undefined) { problem.context = { ...this.metadata }; }
    if (Predicates.isString(this.stack)) { problem.stack = this.stack; }

    const causes = CauseChain.from(this.cause);
    if (causes.length > 0) { problem.causes = causes; }

    // Subclass extras are spread FIRST so a registered member can never be silently
    // clobbered by an ad-hoc bag: a subclass changes `status` through the constructor and
    // `type` through problemType(), both of which are contracts. serializeExtra() omits
    // absent members itself, the same way this method does.
    const extras = this.serializeExtra();

    const result = { ...extras, ...problem } as ProblemDetailsEntity.Type;

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
 * Flattens a cause chain into RFC 9457 `causes` extension members, nearest first.
 *
 * A `BaseError` cause carries its own code/context/correlationId/timestamp, so it projects
 * directly. The first non-`BaseError` cause hands the remainder of the chain to
 * {@link ThrownValueEntity}, which already walks arbitrary thrown values cycle-safely — past
 * that point the two walks would be identical, so there is only one.
 */
class CauseChain {
  public static from(cause: unknown): CauseNodeEntity.Type[] {
    const nodes: CauseNodeEntity.Type[] = [];
    const visited = new WeakSet<object>();
    let current: unknown = cause;

    while (nodes.length < CAUSE_CHAIN_DEPTH_LIMIT) {
      if (Predicates.isNullish(current)) { return nodes; }

      if (!(current instanceof BaseError)) {
        CauseChain.#appendThrownValue(nodes, current);

        return nodes;
      }
      if (visited.has(current)) { return nodes; }
      visited.add(current);

      nodes.push(CauseChain.#fromBaseError(current));
      current = current.cause;
    }

    if (!Predicates.isNullish(current)) {
      nodes.push({ 'detail': CAUSE_DEPTH_SENTINEL, 'title': CAUSE_DEPTH_SENTINEL, 'type': `${PROBLEM_TYPE_BASE}cause-chain-truncated` });
    }

    return nodes;
  }

  static #fromBaseError(error: BaseError): CauseNodeEntity.Type {
    let node: CauseNodeEntity.Type = {
      'code': error.code,
      'detail': error.message,
      'name': error.name,
      'timestamp': error.timestamp,
      'title': error.name,
      'type': `${PROBLEM_TYPE_BASE}${error.code}`
    };

    if (error.correlationId !== undefined) { node = { ...node, 'correlationId': error.correlationId }; }
    if (error.metadata !== undefined) { node = { ...node, 'context': { ...error.metadata } }; }

    return node;
  }

  static #appendThrownValue(nodes: CauseNodeEntity.Type[], value: unknown): void {
    const projection = ThrownValueProjection.project(value);
    const head: CauseNodeEntity.Type = projection.name === undefined
      ? { 'detail': projection.detail, 'title': projection.title, 'type': projection.type }
      : { 'detail': projection.detail, 'name': projection.name, 'title': projection.title, 'type': projection.type };

    nodes.push(head);

    const remainder = projection.causes ?? [];
    for (let index = 0; index < remainder.length && nodes.length < CAUSE_CHAIN_DEPTH_LIMIT; index += 1) {
      const node = remainder[index];
      if (node === undefined) { continue; }
      nodes.push(node);
    }
  }
}
