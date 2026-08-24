import { BaseError } from '@studnicky/errors';
import { Guard } from '@studnicky/types';

import type { RetryErrorOptionsInterface } from '../interfaces/RetryErrorOptionsInterface.js';

import { EMPTY_LENGTH } from '../constants/index.js';

/** Creates detached diagnostic graphs without retaining caller-owned values. */
class RetryDiagnosticSnapshot {
  static error(error: Error, seen = new WeakMap<object, unknown>()): Error {
    const snapshot = this.object(error, seen);

    if (!(snapshot instanceof Error)) {
      throw new TypeError('Retry diagnostic snapshot must preserve Error values.');
    }

    return snapshot;
  }

  private static object(value: object, seen: WeakMap<object, unknown>): object {
    if (seen.has(value)) {
      const result = seen.get(value);

      if (result === undefined || !(Guard.isObjectLike(result) || Guard.isFunction(result))) {
        throw new TypeError('Retry diagnostic snapshot must preserve object values.');
      }
      return result;
    }

    if (value instanceof Error) {
      const snapshot = new Error(value.message, { 'cause': undefined });

      seen.set(value, snapshot);
      snapshot.name = value.name;
      const propertyKeys = Reflect.ownKeys(value);
      const propertyKeyLength = propertyKeys.length;

      for (let propertyKeyIndex = 0; propertyKeyIndex < propertyKeyLength; propertyKeyIndex += 1) {
        const key = propertyKeys[propertyKeyIndex]!;
        const propertyValue: unknown = Reflect.get(value, key);

        if (propertyValue !== null && (typeof propertyValue === 'object' || typeof propertyValue === 'function')) {
          Reflect.set(snapshot, key, RetryDiagnosticSnapshot.object(propertyValue, seen));
        } else {
          Reflect.set(snapshot, key, propertyValue);
        }
      }

      return snapshot;
    }

    if (Array.isArray(value)) {
      const snapshot: unknown[] = [];

      seen.set(value, snapshot);
      const length = value.length;

      for (let index = 0; index < length; index += 1) {
        const entry: unknown = value[index];

        if (entry !== null && (typeof entry === 'object' || typeof entry === 'function')) {
          snapshot.push(RetryDiagnosticSnapshot.object(entry, seen));
        } else {
          snapshot.push(entry);
        }
      }

      return snapshot;
    }

    if (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null) {
      const snapshot: Record<string, unknown> = {};

      seen.set(value, snapshot);
      const propertyKeys = Reflect.ownKeys(value);
      const propertyKeyLength = propertyKeys.length;

      for (let propertyKeyIndex = 0; propertyKeyIndex < propertyKeyLength; propertyKeyIndex += 1) {
        const key = propertyKeys[propertyKeyIndex]!;
        const propertyValue: unknown = Reflect.get(value, key);

        if (propertyValue !== null && (typeof propertyValue === 'object' || typeof propertyValue === 'function')) {
          Reflect.set(snapshot, key, RetryDiagnosticSnapshot.object(propertyValue, seen));
        } else {
          Reflect.set(snapshot, key, propertyValue);
        }
      }

      return snapshot;
    }

    try {
      const snapshot: object = structuredClone(value);

      seen.set(value, snapshot);

      return snapshot;
    } catch {
      const snapshot: Record<string, unknown> = {};

      seen.set(value, snapshot);
      const propertyKeys = Reflect.ownKeys(value);
      const propertyKeyLength = propertyKeys.length;

      for (let propertyKeyIndex = 0; propertyKeyIndex < propertyKeyLength; propertyKeyIndex += 1) {
        const key = propertyKeys[propertyKeyIndex]!;
        const propertyValue: unknown = Reflect.get(value, key);

        if (propertyValue !== null && (typeof propertyValue === 'object' || typeof propertyValue === 'function')) {
          Reflect.set(snapshot, key, RetryDiagnosticSnapshot.object(propertyValue, seen));
        } else {
          Reflect.set(snapshot, key, propertyValue);
        }
      }

      return snapshot;
    }
  }
}

/**
 * Base error class for all retry-related failures
 *
 * Extended by MaximumRetriesExceededError and NonRetryableError.
 * Provides common properties for tracking attempt count and error history.
 */
export class RetryError extends BaseError {
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
    const code = options?.code ?? 'retry.failed';
    const errors = options?.errors ?? [];
    const seen = new WeakMap<object, unknown>();
    const causeSnapshot = cause === undefined ? undefined : RetryDiagnosticSnapshot.error(cause, seen);

    let errorSnapshots: readonly Error[];

    if (errors.length > EMPTY_LENGTH) {
      const snapshots: Error[] = [];
      const errorLength = errors.length;

      for (let errorIndex = 0; errorIndex < errorLength; errorIndex += 1) {
        const error = errors[errorIndex]!;

        snapshots.push(RetryDiagnosticSnapshot.error(error, seen));
      }
      const result = Object.freeze(snapshots);

      errorSnapshots = result;
    } else if (causeSnapshot !== undefined) {
      errorSnapshots = Object.freeze([causeSnapshot]);
    } else {
      errorSnapshots = Object.freeze([]);
    }

    // `cause` is deliberately absent as an own property: this class exposes the cause
    // through `#causeSnapshot` projection, and an own `cause` would shadow it. Withholding
    // it from `BaseError` is what achieves that — `BaseError` installs `cause` only when
    // the value is defined — so the detached-projection contract holds with no property to
    // remove afterwards. `instantiation.loop.spec.ts` covers the contract.
    super({
      'code': code, 'message': message, 'retryable': false
    });
    this.#causeSnapshot = causeSnapshot;
    this.#errors = errorSnapshots;
    this.attempts = attempts;
  }
}
