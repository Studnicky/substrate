
import { RuntimeError } from '@studnicky/errors/browser';
import { BaseError, type BaseErrorArgumentsInterface, JsonObject, Predicates } from '@studnicky/types/browser';

import type { RetryErrorOptionsInterface } from '../interfaces/RetryErrorOptionsInterface.js';

import { EMPTY_LENGTH } from '../constants/index.js';

/** Creates detached diagnostic graphs without retaining caller-owned values. */
class RetryDiagnosticSnapshot {
  static error(error: Error, seen = new WeakMap<object, unknown>()): Error {
    if (!Predicates.isError(error)) {
      throw new TypeError('RetryDiagnosticSnapshot.error requires an Error value.');
    }

    const snapshot = this.object(error, seen);

    if (!(Predicates.isError(snapshot))) {
      throw RuntimeError.create('Retry diagnostic snapshot must preserve Error values.');
    }

    return snapshot;
  }

  private static object(value: object, seen: WeakMap<object, unknown>): object {
    const cached = RetryDiagnosticSnapshot.resolveCached(value, seen);
    if (cached !== undefined) {
      return cached;
    }
    if (Predicates.isError(value)) {
      const snapshot = RetryDiagnosticSnapshot.snapshotError(value, seen);
      return snapshot;
    }
    if (Predicates.isArray(value)) {
      const snapshot = RetryDiagnosticSnapshot.snapshotArray(value, seen);
      return snapshot;
    }
    if (Predicates.isPlainObject(value)) {
      const snapshot = RetryDiagnosticSnapshot.snapshotPlainObject(value, seen);
      return snapshot;
    }
    const snapshot = RetryDiagnosticSnapshot.snapshotStructured(value, seen);
    return snapshot;
  }

  /** Returns the prior snapshot for an already-visited value, or undefined when unseen. */
  private static resolveCached(value: object, seen: WeakMap<object, unknown>): object | undefined {
    if (!seen.has(value)) {
      return undefined;
    }
    const result = seen.get(value);

    if (result === undefined || !Predicates.isObjectLikeOrFunction(result)) {
      throw RuntimeError.create('Retry diagnostic snapshot must preserve object values.');
    }
    return result;
  }

  private static snapshotError(value: Error, seen: WeakMap<object, unknown>): object {
    const snapshot = new Error(value.message);

    seen.set(value, snapshot);
    snapshot.name = value.name;
    RetryDiagnosticSnapshot.copyProperties(value, snapshot, seen);

    return snapshot;
  }

  private static snapshotArray(value: readonly unknown[], seen: WeakMap<object, unknown>): object {
    const snapshot: unknown[] = [];

    seen.set(value, snapshot);
    const length = value.length;

    for (let index = 0; index < length; index += 1) {
      snapshot.push(RetryDiagnosticSnapshot.snapshotValue(value[index], seen));
    }

    return snapshot;
  }

  private static snapshotPlainObject(value: object, seen: WeakMap<object, unknown>): object {
    const snapshot: Record<string, unknown> = {};

    seen.set(value, snapshot);
    RetryDiagnosticSnapshot.copyProperties(value, snapshot, seen);

    return snapshot;
  }

  private static snapshotStructured(value: object, seen: WeakMap<object, unknown>): object {
    try {
      const snapshot: object = structuredClone(value);

      seen.set(value, snapshot);

      return snapshot;
    } catch {
      const snapshot: Record<string, unknown> = {};

      seen.set(value, snapshot);
      RetryDiagnosticSnapshot.copyProperties(value, snapshot, seen);

      return snapshot;
    }
  }

  private static copyProperties(source: object, target: object, seen: WeakMap<object, unknown>): void {
    const propertyKeys = Reflect.ownKeys(source);
    const propertyKeyLength = propertyKeys.length;

    for (let propertyKeyIndex = 0; propertyKeyIndex < propertyKeyLength; propertyKeyIndex += 1) {
      const key = propertyKeys[propertyKeyIndex]!;
      const propertyValue: unknown = Reflect.get(source, key);

      JsonObject.write(target, key, RetryDiagnosticSnapshot.snapshotValue(propertyValue, seen));
    }
  }

  private static snapshotValue(value: unknown, seen: WeakMap<object, unknown>): unknown {
    const result = Predicates.isObjectLikeOrFunction(value) ? RetryDiagnosticSnapshot.object(value, seen) : value;
    return result;
  }
}

/**
 * Base error class for all retry-related failures
 *
 * Extended by MaximumRetriesExceededError and NonRetryableError.
 * Provides common properties for tracking attempt count and error history.
 */
export class RetryError extends BaseError {
  public override readonly name: string = 'RetryError';

  readonly #causeSnapshot: Error | undefined;
  readonly #errors: readonly Error[];

  public readonly attempts: number;

  /** Returns a detached snapshot of the failure that terminated retrying. */
  public override get cause(): Error | undefined {
    const cause = this.#causeSnapshot;
    const result = cause === undefined ? undefined : RetryDiagnosticSnapshot.error(cause);

    return result;
  }

  /** Returns a readonly detached snapshot of the complete attempt history. */
  public get errors(): readonly Error[] {
    const snapshots: Error[] = [];
    const seen = new WeakMap<object, unknown>();
    const errorLength = this.#errors.length;

    for (let errorIndex = 0; errorIndex < errorLength; errorIndex += 1) {
      const error = this.#errors[errorIndex]!;

      snapshots.push(RetryDiagnosticSnapshot.error(error, seen));
    }
    const result = Object.freeze(snapshots);

    return result;
  }

  /**
   * Create a RetryError
   *
   * @param message - Error message
   * @param attempts - Number of attempts made
   * @param options - Optional cause, errors array, and error code
   */
  constructor(
    message: string,
    attempts: number,
    options?: RetryErrorOptionsInterface
  ) {
    const cause = options?.cause;
    const seen = new WeakMap<object, unknown>();
    const causeSnapshot = cause === undefined ? undefined : RetryDiagnosticSnapshot.error(cause, seen);
    const errorSnapshots = RetryError.buildErrorSnapshots(options?.errors ?? [], causeSnapshot, seen);

    // `cause` is deliberately absent as an own property: this class exposes the cause
    // through `#causeSnapshot` projection, and an own `cause` would shadow it. Withholding
    // it from `BaseError` is what achieves that — `BaseError` installs `cause` only when
    // the value is defined — so the detached-projection contract holds with no property to
    // remove afterwards. `instantiation.loop.spec.ts` covers the contract.
    super(RetryError.buildBaseErrorOptions(message, options));
    this.#causeSnapshot = causeSnapshot;
    this.#errors = errorSnapshots;
    this.attempts = attempts;
  }

  private static buildErrorSnapshots(
    errors: readonly Error[],
    causeSnapshot: Error | undefined,
    seen: WeakMap<object, unknown>
  ): readonly Error[] {
    if (errors.length > EMPTY_LENGTH) {
      const snapshots: Error[] = [];
      const errorLength = errors.length;

      for (let errorIndex = 0; errorIndex < errorLength; errorIndex += 1) {
        const error = errors[errorIndex]!;

        snapshots.push(RetryDiagnosticSnapshot.error(error, seen));
      }
      const result = Object.freeze(snapshots);
      return result;
    }
    if (causeSnapshot !== undefined) {
      const result = Object.freeze([causeSnapshot]);
      return result;
    }
    const result = Object.freeze([]);
    return result;
  }

  private static buildBaseErrorOptions(
    message: string,
    options?: RetryErrorOptionsInterface
  ): Readonly<BaseErrorArgumentsInterface> {
    const resolvedOptions = options ?? {};
    const base: BaseErrorArgumentsInterface = {
      'code': resolvedOptions.code ?? 'retry.failed',
      'message': message,
      'retryable': false
    };
    if (resolvedOptions.correlationId !== undefined) {
      base.correlationId = resolvedOptions.correlationId;
    }
    if (resolvedOptions.instance !== undefined) {
      base.instance = resolvedOptions.instance;
    }
    if (resolvedOptions.metadata !== undefined) {
      base.metadata = resolvedOptions.metadata;
    }
    if (resolvedOptions.status !== undefined) {
      base.status = resolvedOptions.status;
    }
    return base;
  }
}
