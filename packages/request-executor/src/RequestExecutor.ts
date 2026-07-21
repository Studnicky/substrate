/**
 * One-shot request execution pattern composing fetch, retry, signal, timing, and context
 */

import type { Context } from '@studnicky/context';
import type { Timing } from '@studnicky/timing';

import { FetchClient } from '@studnicky/fetch';
import { Retry } from '@studnicky/retry';
import { Signal } from '@studnicky/signal';
import { TIMING_STATUS, TimingEvent } from '@studnicky/timing';

import type { RequestExecutorConfigInterface } from './interfaces/RequestExecutorConfigInterface.js';
import type { RequestExecutorDepsInterface } from './interfaces/RequestExecutorDepsInterface.js';
import type { RequestExecutorExecuteOptionsInterface } from './interfaces/RequestExecutorExecuteOptionsInterface.js';

/**
 * Composes `@studnicky/fetch`, `@studnicky/retry`, `@studnicky/signal`, `@studnicky/timing`,
 * and `@studnicky/context` into a one-shot request execution pattern.
 *
 * `execute()` composes a cancellation signal via `Signal#compose()`, runs the caller-supplied
 * `fn` through the retry loop, optionally brackets the whole retry loop with a `Timing` span,
 * and — if a `Context` was composed — runs the entire call inside a fresh context scope.
 *
 * `RequestExecutor` has no lifecycle hooks of its own. Observability is delegated entirely to
 * the composed primitives: callers retain explicit ownership of subclassed
 * `FetchClient`/`Retry`/`Timing`/`Context` instances passed in through configuration.
 *
 * @example Direct composition
 * ```typescript
 * const executor = RequestExecutor.create({
 *   fetchClient: { baseURL: 'https://api.example.com' },
 *   retry: { maxRetries: 3 },
 *   deadlineMs: 5000
 * });
 *
 * const response = await executor.execute((client, signal) => client.get('/users', { signal }));
 * ```
 */
export class RequestExecutor {
  /**
   * Creates a new RequestExecutor, defaulting any omitted primitive.
   *
   * @param config - Composition configuration
   * @returns New RequestExecutor instance
   */
  static create(config: RequestExecutorConfigInterface = {}): RequestExecutor {
    const result = new this({
      'context': config.context,
      'deadlineMs': config.deadlineMs,
      'fetchClient': RequestExecutor.#resolveFetchClient(config.fetchClient),
      'retry': RequestExecutor.#resolveRetry(config.retry),
      'signal': config.signal ?? Signal.create(),
      'timing': config.timing
    });
    return result;
  }

  static #resolveFetchClient(value: RequestExecutorConfigInterface['fetchClient']): FetchClient {
    if (value instanceof FetchClient) {
      return value;
    }
    const result = FetchClient.create(value ?? {});
    return result;
  }

  static #resolveRetry(value: RequestExecutorConfigInterface['retry']): Retry {
    if (value instanceof Retry) {
      return value;
    }
    const result = Retry.create(value);
    return result;
  }

  readonly #context: Context | undefined;
  readonly #deadlineMs: number | undefined;
  readonly #fetchClient: FetchClient;
  readonly #retry: Retry;
  readonly #signal: Signal;
  readonly #timing: Timing | undefined;

  protected constructor(deps: RequestExecutorDepsInterface) {
    this.#fetchClient = deps.fetchClient;
    this.#retry = deps.retry;
    this.#signal = deps.signal;
    this.#timing = deps.timing;
    this.#context = deps.context;
    this.#deadlineMs = deps.deadlineMs;
  }

  /**
   * Runs `fn` against the composed FetchClient and a composed cancellation AbortSignal, wrapped
   * in the retry loop and (when configured) a Timing span and a Context scope.
   *
   * @param fn - Receives the composed FetchClient and the composed AbortSignal for this call.
   *   The caller passes the signal into whichever verb call it makes (e.g. `client.get(path, { signal })`).
   * @param options - Per-call signal/deadline/context-seed overrides
   * @returns The result of `fn`, after retries succeed
   */
  async execute<T>(
    fn: (client: FetchClient, signal: AbortSignal) => Promise<T>,
    options?: RequestExecutorExecuteOptionsInterface
  ): Promise<T> {
    const deadlineMs = options?.deadlineMs ?? this.#deadlineMs;
    const composedSignal = await this.#signal.compose({
      ...(deadlineMs !== undefined ? { 'deadlineMs': deadlineMs } : {}),
      ...(options?.signal !== undefined ? { 'signal': options.signal } : {})
    });

    const runRetryable = (): Promise<T> => {
      const result = this.#retry.execute((): Promise<T> => {
        const result = fn(this.#fetchClient, composedSignal);
        return result;
      });
      return result;
    };

    const runTimed = (): Promise<T> => {
      const result = this.#runWithTiming(runRetryable);
      return result;
    };

    if (this.#context === undefined) {
      const result = await runTimed();
      return result;
    }

    const scope = this.#context.initialize(options?.contextInitial);

    try {
      const result = await scope.execute((): Promise<T> => {
        const result = runTimed();
        return result;
      });
      return result;
    } finally {
      scope.terminate();
    }
  }

  #emit(status: (typeof TIMING_STATUS)[keyof typeof TIMING_STATUS]): void {
    this.#timing?.event(TimingEvent.create({
      'component': 'RequestExecutor',
      'operation': 'execute',
      'status': status
    }));
  }

  async #runWithTiming<T>(fn: () => Promise<T>): Promise<T> {
    if (this.#timing === undefined) {
      const result = await fn();
      return result;
    }

    this.#emit(TIMING_STATUS.START);

    try {
      const result = await fn();

      this.#emit(TIMING_STATUS.COMPLETE);

      return result;
    } catch (error) {
      this.#emit(TIMING_STATUS.ERROR);

      throw error;
    }
  }
}
