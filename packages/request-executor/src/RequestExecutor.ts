/**
 * One-shot request execution pattern composing fetch, retry, signal, and an optional scope, with
 * lifecycle hooks bracketing the retry loop for observability.
 */
import type { FetchClientInterface } from '@studnicky/fetch';

import { type HookInvocationError, HookInvoker, RuntimeError } from '@studnicky/errors';
import { Retry } from '@studnicky/retry';
import { Signal } from '@studnicky/signal';
import { Predicates } from '@studnicky/types';

import type { RequestExecutorConfigInterface } from './interfaces/RequestExecutorConfigInterface.js';
import type { RequestExecutorDepsInterface } from './interfaces/RequestExecutorDepsInterface.js';
import type { RequestExecutorExecuteOptionsInterface } from './interfaces/RequestExecutorExecuteOptionsInterface.js';

/**
 * Composes `@studnicky/fetch`, `@studnicky/retry`, `@studnicky/signal`, and an optional scope port
 * into a one-shot request execution pattern.
 *
 * `execute()` composes a cancellation signal via `Signal#compose()`, runs the caller-supplied
 * `callback` through the retry loop, brackets the whole retry loop with `onExecuteStart` /
 * `onExecuteComplete` / `onExecuteError` lifecycle hooks, and — if a scope factory was composed —
 * runs the entire call inside a fresh scope.
 *
 * The three lifecycle hooks are no-ops by default and run through an internal `HookInvoker`
 * that swallows a throwing override: a rejected hook is recorded (see `hookErrorCount` /
 * `getHookErrors()`) but never replaces `execute()`'s resolved result or thrown error. Callers
 * retain explicit ownership of supplied fetch client, retry, and scope implementations passed in
 * through configuration for primitive-level observability.
 *
 * @example Direct composition
 * ```typescript
 * const executor = RequestExecutor.create({
 *   fetchClient: BrowserFetchClient.create({ baseURL: 'https://api.example.com' }),
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
  static create(config: RequestExecutorConfigInterface): RequestExecutor {
    const result = new this({
      'deadlineMs': config.deadlineMs,
      'fetchClient': config.fetchClient,
      'retry': RequestExecutor.#resolveRetry(config.retry),
      'scope': config.scope,
      'signal': config.signal ?? Signal.create()
    });
    return result;
  }

  static #resolveRetry(value: RequestExecutorConfigInterface['retry']): Retry {
    if (value instanceof Retry) {
      return value;
    }
    const result = Retry.create(value);
    return result;
  }

  readonly #scope: RequestExecutorDepsInterface['scope'];
  readonly #deadlineMs: number | undefined;
  readonly #fetchClient: FetchClientInterface;
  readonly #retry: Retry;
  readonly #signal: Signal;

  protected readonly hooks: HookInvoker;

  protected constructor(deps: RequestExecutorDepsInterface) {
    this.#fetchClient = deps.fetchClient;
    this.#retry = deps.retry;
    this.#signal = deps.signal;
    this.#scope = deps.scope;
    this.#deadlineMs = deps.deadlineMs;
    this.hooks = new RequestExecutor.#OwnedHookInvoker();
  }

  /**
   * Runs `callback` against the composed FetchClient and a composed cancellation AbortSignal, wrapped
   * in the retry loop and, when configured, an isolated scope. The retry loop is bracketed by the
   * `onExecuteStart`/`onExecuteComplete`/`onExecuteError` lifecycle hooks.
   *
   * @param callback - Receives the composed fetch client and the composed AbortSignal for this call.
   *   The caller passes the signal into whichever verb call it makes (e.g. `client.get(path, { signal })`).
   * @param options - Per-call signal, deadline, and scope-seed overrides
   * @returns The result of `callback`, after retries succeed
   */
  async execute<T>(
    callback: (client: FetchClientInterface, signal: AbortSignal) => Promise<T>,
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
        const error = Predicates.isError(cause) ? cause : RuntimeError.create(String(cause));
        this.hooks.invoke('onExecuteError', () => {
          const hookResult = this.onExecuteError(error);
          return hookResult;
        });

        throw cause;
      }
    };

    if (this.#scope === undefined) {
      const result = await runObserved();
      return result;
    }

    const scope = this.#scope.initialize(options?.scopeInitial);

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

  /** Fires before the retry loop begins, inside the request scope when one is composed. */
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
