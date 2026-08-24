/**
 * One-shot request execution pattern composing fetch, retry, signal, and context, with
 * lifecycle hooks bracketing the retry loop for observability.
 */

import type { Context } from '@studnicky/context';
import type { HookInvocationError } from '@studnicky/errors';

import { HookInvoker } from '@studnicky/errors';
import { FetchClient } from '@studnicky/fetch';
import { Retry } from '@studnicky/retry';
import { Signal } from '@studnicky/signal';

import type { RequestExecutorConfigInterface } from './interfaces/RequestExecutorConfigInterface.js';
import type { RequestExecutorDepsInterface } from './interfaces/RequestExecutorDepsInterface.js';
import type { RequestExecutorExecuteOptionsInterface } from './interfaces/RequestExecutorExecuteOptionsInterface.js';

/**
 * Composes `@studnicky/fetch`, `@studnicky/retry`, `@studnicky/signal`, and `@studnicky/context`
 * into a one-shot request execution pattern.
 *
 * `execute()` composes a cancellation signal via `Signal#compose()`, runs the caller-supplied
 * `callback` through the retry loop, brackets the whole retry loop with `onExecuteStart` /
 * `onExecuteComplete` / `onExecuteError` lifecycle hooks, and — if a `Context` was composed —
 * runs the entire call inside a fresh context scope.
 *
 * The three lifecycle hooks are no-ops by default and run through an internal `HookInvoker`
 * that swallows a throwing override: a rejected hook is recorded (see `hookErrorCount` /
 * `getHookErrors()`) but never replaces `execute()`'s resolved result or thrown error. Callers
 * retain explicit ownership of subclassed `FetchClient`/`Retry`/`Context` instances passed in
 * through configuration for primitive-level observability.
 *
 * @example Direct composition
 * ```typescript
 * const executor = RequestExecutor.create({
 *   fetchClient: { baseURL: 'https://api.example.com' },
 *   retry: { maximumRetries: 3 },
 *   deadlineMs: 5000
 * });
 *
 * const response = await executor.execute((client, signal) => client.get('/users', { signal }));
 * ```
 *
 * @example Lifecycle hooks
 * ```typescript
 * class ObservedRequestExecutor extends RequestExecutor {
 *   protected override onExecuteStart(): void {
 *     console.log('request started');
 *   }
 *
 *   protected override onExecuteComplete<T>(result: T): void {
 *     console.log('request complete', result);
 *   }
 *
 *   protected override onExecuteError(error: Error): void {
 *     console.error('request failed', error);
 *   }
 * }
 * ```
 */
export class RequestExecutor {
  /** Keeps request execution intact when a lifecycle hook fails. */
  static readonly #OwnedHookInvoker = class RequestExecutorHookInvoker extends HookInvoker {
    protected override onHookError(): void {}
  };

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
      'signal': config.signal ?? Signal.create()
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

  protected readonly hooks: HookInvoker;

  protected constructor(deps: RequestExecutorDepsInterface) {
    this.#fetchClient = deps.fetchClient;
    this.#retry = deps.retry;
    this.#signal = deps.signal;
    this.#context = deps.context;
    this.#deadlineMs = deps.deadlineMs;
    this.hooks = new RequestExecutor.#OwnedHookInvoker();
  }

  /**
   * Runs `callback` against the composed FetchClient and a composed cancellation AbortSignal, wrapped
   * in the retry loop and (when configured) a Context scope. The retry loop is bracketed by the
   * `onExecuteStart`/`onExecuteComplete`/`onExecuteError` lifecycle hooks.
   *
   * @param callback - Receives the composed FetchClient and the composed AbortSignal for this call.
   *   The caller passes the signal into whichever verb call it makes (e.g. `client.get(path, { signal })`).
   * @param options - Per-call signal/deadline/context-seed overrides
   * @returns The result of `callback`, after retries succeed
   */
  async execute<T>(
    callback: (client: FetchClient, signal: AbortSignal) => Promise<T>,
    options?: RequestExecutorExecuteOptionsInterface
  ): Promise<T> {
    const deadlineMs = options?.deadlineMs ?? this.#deadlineMs;
    const composedSignal = await this.#signal.compose({
      ...(deadlineMs !== undefined ? { 'deadlineMs': deadlineMs } : {}),
      ...(options?.signal !== undefined ? { 'signal': options.signal } : {})
    });

    const runObserved = async (): Promise<T> => {
      this.hooks.invoke('onExecuteStart', () => {
        const result = this.onExecuteStart();
        return result;
      });

      try {
        const result = await this.#retry.execute((): Promise<T> => {
          const callbackResult = callback(this.#fetchClient, composedSignal);
          return callbackResult;
        });

        this.hooks.invoke('onExecuteComplete', () => {
          const hookResult = this.onExecuteComplete(result);
          return hookResult;
        });

        return result;
      } catch (cause) {
        const error = cause instanceof Error ? cause : new Error(String(cause));
        this.hooks.invoke('onExecuteError', () => {
          const hookResult = this.onExecuteError(error);
          return hookResult;
        });

        throw cause;
      }
    };

    if (this.#context === undefined) {
      const result = await runObserved();
      return result;
    }

    const scope = this.#context.initialize(options?.contextInitial);

    try {
      const result = await scope.execute((): Promise<T> => {
        const observedResult = runObserved();
        return observedResult;
      });
      return result;
    } finally {
      scope.terminate();
    }
  }

  // ---------------------------------------------------------------------------
  // Lifecycle hooks — no-op by default. Override to add logging/tracing/metrics.
  // Overrides must not throw or block. A throwing override is recorded (see
  // `hookErrorCount`/`getHookErrors()`) and never replaces execute()'s resolved
  // result or thrown error.
  // ---------------------------------------------------------------------------

  /** Fires before the retry loop begins, inside the context scope when one is composed. */
  protected onExecuteStart(): void {}

  /**
   * Fires after the retry loop resolves, immediately before `execute()` returns.
   * `result` is the value `execute()` is about to resolve with.
   */
  protected onExecuteComplete(_result: unknown): void {}

  /**
   * Fires once the retry loop's final attempt has failed, immediately before `execute()`
   * rethrows. Non-Error failures are represented as an Error for this hook while
   * `execute()` rethrows the original value unchanged.
   */
  protected onExecuteError(_error: Error): void {}

  /** Count of hook failures recorded since construction. */
  get hookErrorCount(): number {
    const result = this.hooks.hookErrorCount;
    return result;
  }

  /** Returns detached diagnostics for every hook failure recorded since construction. */
  getHookErrors(): readonly HookInvocationError[] {
    const result = this.hooks.getHookErrors();
    return result;
  }
}
