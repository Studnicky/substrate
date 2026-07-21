import { BaseError } from '@studnicky/errors';

import type { RetryErrorOptionsInterface } from '../interfaces/RetryErrorOptionsInterface.js';

import { EMPTY_LENGTH } from '../constants/index.js';

/** Creates detached diagnostic graphs without retaining caller-owned values. */
class RetryDiagnosticSnapshot {
  static error(error: Error, seen: WeakMap<object, unknown> = new WeakMap()): Error {
    const snapshot = this.value(error, seen);
    if (!(snapshot instanceof Error)) {
      throw new TypeError('Retry diagnostic snapshot must preserve Error values.');
    }
    return snapshot;
  }

  private static value(value: unknown, seen: WeakMap<object, unknown>): unknown {
    if (value === null || (typeof value !== 'object' && typeof value !== 'function')) {
      return value;
    }

    if (seen.has(value)) {
      return seen.get(value);
    }

    if (value instanceof Error) {
      const snapshot = new Error(value.message, { 'cause': undefined });
      seen.set(value, snapshot);
      snapshot.name = value.name;
      for (const key of Reflect.ownKeys(value)) {
        const propertyValue: unknown = Reflect.get(value, key);
        Reflect.set(snapshot, key, this.value(propertyValue, seen));
      }
      return snapshot;
    }

    if (Array.isArray(value)) {
      const snapshot: unknown[] = [];
      seen.set(value, snapshot);
      for (const entry of value) {
        snapshot.push(this.value(entry, seen));
      }
      return snapshot;
    }

    if (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null) {
      const snapshot: Record<string, unknown> = {};
      seen.set(value, snapshot);
      for (const key of Reflect.ownKeys(value)) {
        const propertyValue: unknown = Reflect.get(value, key);
        Reflect.set(snapshot, key, this.value(propertyValue, seen));
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
      for (const key of Reflect.ownKeys(value)) {
        const propertyValue: unknown = Reflect.get(value, key);
        Reflect.set(snapshot, key, this.value(propertyValue, seen));
      }
      return snapshot;
    }
  }
}

/**
 * Base error class for all retry-related failures
 *
 * Extended by MaxRetriesExceededError and NonRetryableError.
 * Provides common properties for tracking attempt count and error history.
 */
export class RetryError extends BaseError {
  readonly #causeSnapshot: Error | undefined;
  readonly #errors: readonly Error[];

  public readonly attempts: number;

  /** Returns a detached snapshot of the failure that terminated retrying. */
  public override get cause(): Error | undefined {
    const cause = this.#causeSnapshot;
    return cause === undefined ? undefined : RetryDiagnosticSnapshot.error(cause);
  }

  /** Returns a readonly detached snapshot of the complete attempt history. */
  public get errors(): readonly Error[] {
    const snapshots: Error[] = [];
    const seen = new WeakMap<object, unknown>();
    for (const error of this.#errors) {
      snapshots.push(RetryDiagnosticSnapshot.error(error, seen));
    }
    return Object.freeze(snapshots);
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
      for (const error of errors) {
        snapshots.push(RetryDiagnosticSnapshot.error(error, seen));
      }
      errorSnapshots = Object.freeze(snapshots);
    } else if (causeSnapshot !== undefined) {
      errorSnapshots = Object.freeze([causeSnapshot]);
    } else {
      errorSnapshots = Object.freeze([]);
    }

    super({ 'cause': undefined, 'code': code, 'message': message, 'retryable': false });
    Reflect.deleteProperty(this, 'cause');
    this.#causeSnapshot = causeSnapshot;
    this.#errors = errorSnapshots;
    this.attempts = attempts;
  }
}
