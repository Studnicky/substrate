/**
 * One-shot request execution pattern composing fetch, retry, signal, optional operation policies, and an optional scope, with
 * lifecycle hooks bracketing the retry loop for observability.
 */
import type { FetchClientInterface } from '@studnicky/fetch/interfaces';
import type { RetryInterface } from '@studnicky/retry/interfaces';
import type { SignalInterface } from '@studnicky/signal/interfaces';

import { type HookInvocationError, HookInvoker, RuntimeError } from '@studnicky/errors/browser';
import { Predicates } from '@studnicky/types/browser';

import type { RequestExecutorConfigInterface } from './interfaces/RequestExecutorConfigInterface.js';
import type { RequestExecutorDepsInterface } from './interfaces/RequestExecutorDepsInterface.js';
import type { RequestExecutorExecuteOptionsInterface } from './interfaces/RequestExecutorExecuteOptionsInterface.js';
import type { RequestExecutorOperationContextInterface } from './interfaces/RequestExecutorOperationContextInterface.js';

import { RequestExecutorConfigDataEntity } from './entities/RequestExecutorConfigDataEntity.js';
import { RequestExecutorExecuteOptionsDataEntity } from './entities/RequestExecutorExecuteOptionsDataEntity.js';

/**
 * Composes `@studnicky/fetch`, `@studnicky/retry`, `@studnicky/signal`, `@studnicky/pipeline`, and an optional scope port
 * into a one-shot request execution pattern.
 *
 * `execute()` composes a cancellation signal via `Signal#compose()`, runs the caller-supplied
 * `callback` through the retry loop, surrounds the observed retry operation with any configured `OperationPipeline`, brackets the whole retry loop with `onExecuteStart` /
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
 *   fetchClient: BrowserFetchClient.create({ baseURL: "https://api.example.com" }),
 *   retry: Retry.create({ maximumRetries: 3 }),
 *   signal: Signal.create(),
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
   * Creates a new RequestExecutor from caller-owned runtime ports.
   *
   * @param config - Composition configuration
   * @returns New RequestExecutor instance
   */
  static create(config: RequestExecutorConfigInterface): RequestExecutor {
    const result = new this(RequestExecutor.#intakeConfig(config));
    return result;
  }

  static #intakeConfig(config: RequestExecutorConfigInterface): RequestExecutorDepsInterface {
    const input = RequestExecutor.#intakeRecord(config, 'RequestExecutor.create configuration');
    const data = RequestExecutorConfigDataEntity.intake(
      RequestExecutor.#withoutRuntimeFields(input, RequestExecutor.#configRuntimeFieldNames)
    );
    const fetchClient = RequestExecutor.#requireFetchClient(Reflect.get(input, 'fetchClient'));
    const retry = RequestExecutor.#requireRetry(Reflect.get(input, 'retry'));
    const signal = RequestExecutor.#requireSignal(Reflect.get(input, 'signal'));
    const pipelineValue = Reflect.get(input, 'pipeline');
    const scopeValue = Reflect.get(input, 'scope');
    const pipeline = pipelineValue === undefined ? undefined : RequestExecutor.#requirePipeline(pipelineValue);
    const scope = scopeValue === undefined ? undefined : RequestExecutor.#requireScope(scopeValue);

    return {
      'deadlineMs': data.deadlineMs,
      'fetchClient': fetchClient,
      'pipeline': pipeline,
      'retry': retry,
      'scope': scope,
      'signal': signal
    };
  }

  static #intakeExecuteOptions(options: RequestExecutorExecuteOptionsInterface | undefined): {
    readonly 'data': RequestExecutorExecuteOptionsDataEntity.Type;
    readonly 'signal': AbortSignal | undefined;
  } {
    if (options === undefined) {
      return { 'data': RequestExecutorExecuteOptionsDataEntity.intake({}), 'signal': undefined };
    }

    const input = RequestExecutor.#intakeRecord(options, 'RequestExecutor.execute options');
    const data = RequestExecutorExecuteOptionsDataEntity.intake(
      RequestExecutor.#withoutRuntimeFields(input, RequestExecutor.#executeRuntimeFieldNames)
    );
    const signalValue = Reflect.get(input, 'signal');
    const signal = signalValue === undefined ? undefined : RequestExecutor.#requireAbortSignal(signalValue);

    return { 'data': data, 'signal': signal };
  }

  static #intakeRecord(input: unknown, description: string): Record<string, unknown> {
    if (!Predicates.isPlainObject(input)) {
      throw RuntimeError.create(`${description} must be a plain object`);
    }
    return input;
  }

  static #withoutRuntimeFields(input: Record<string, unknown>, runtimeFieldNames: ReadonlySet<string>): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    const entries = Object.entries(input);
    const entryCount = entries.length;
    for (let index = 0; index < entryCount; index += 1) {
      const [key, value] = entries[index]!;
      if (!runtimeFieldNames.has(key)) {
        Reflect.set(data, key, value);
      }
    }
    return data;
  }

  static #hasMethods(value: unknown, methodNames: readonly string[]): value is Record<string, unknown> {
    if (!Predicates.isObjectLike(value)) {
      return false;
    }
    const methodCount = methodNames.length;
    for (let index = 0; index < methodCount; index += 1) {
      const methodName = methodNames[index]!;
      if (!Predicates.isFunction(Reflect.get(value, methodName))) {
        return false;
      }
    }
    return true;
  }

  static #isFetchClient(value: unknown): value is FetchClientInterface {
    const result = RequestExecutor.#hasMethods(value, RequestExecutor.#fetchClientMethodNames);
    return result;
  }

  static #isRetry(value: unknown): value is RetryInterface {
    const result = RequestExecutor.#hasMethods(value, RequestExecutor.#retryMethodNames);
    return result;
  }

  static #isSignal(value: unknown): value is SignalInterface {
    const result = RequestExecutor.#hasMethods(value, RequestExecutor.#signalMethodNames);
    return result;
  }

  static #isPipeline(value: unknown): value is NonNullable<RequestExecutorDepsInterface['pipeline']> {
    const result = RequestExecutor.#hasMethods(value, RequestExecutor.#pipelineMethodNames);
    return result;
  }

  static #isScope(value: unknown): value is NonNullable<RequestExecutorDepsInterface['scope']> {
    const result = RequestExecutor.#hasMethods(value, RequestExecutor.#scopeMethodNames);
    return result;
  }

  static #isAbortSignal(value: object): value is AbortSignal {
    const result = Predicates.isBoolean(Reflect.get(value, 'aborted'))
      && Predicates.isFunction(Reflect.get(value, 'addEventListener'))
      && Predicates.isFunction(Reflect.get(value, 'removeEventListener'));
    return result;
  }

  static #requireFetchClient(value: unknown): FetchClientInterface {
    if (!RequestExecutor.#isFetchClient(value)) {
      throw RuntimeError.create('fetchClient must implement FetchClientInterface');
    }
    return value;
  }

  static #requireRetry(value: unknown): RetryInterface {
    if (!RequestExecutor.#isRetry(value)) {
      throw RuntimeError.create('retry must implement RetryInterface');
    }
    return value;
  }

  static #requireSignal(value: unknown): SignalInterface {
    if (!RequestExecutor.#isSignal(value)) {
      throw RuntimeError.create('signal must implement SignalInterface');
    }
    return value;
  }

  static #requirePipeline(value: unknown): RequestExecutorDepsInterface['pipeline'] {
    if (!RequestExecutor.#isPipeline(value)) {
      throw RuntimeError.create('pipeline must implement OperationPipelineInterface');
    }
    return value;
  }

  static #requireScope(value: unknown): RequestExecutorDepsInterface['scope'] {
    if (!RequestExecutor.#isScope(value)) {
      throw RuntimeError.create('scope must implement RequestScopeFactoryInterface');
    }
    return value;
  }

  static #requireAbortSignal(value: unknown): AbortSignal {
    if (!Predicates.isObjectLike(value) || !RequestExecutor.#isAbortSignal(value)) {
      throw RuntimeError.create('signal must implement AbortSignal');
    }
    return value;
  }

  static readonly #configRuntimeFieldNames: ReadonlySet<string> = new Set([
    'fetchClient', 'pipeline', 'retry', 'scope', 'signal'
  ]);
  static readonly #executeRuntimeFieldNames: ReadonlySet<string> = new Set(['signal']);
  static readonly #fetchClientMethodNames = ['delete', 'destroy', 'get', 'head', 'options', 'patch', 'post', 'put'] as const;
  static readonly #pipelineMethodNames = ['run'] as const;
  static readonly #retryMethodNames = ['execute', 'getStats', 'resetStats'] as const;
  static readonly #scopeMethodNames = ['initialize'] as const;
  static readonly #signalMethodNames = ['compose'] as const;

  readonly #scope: RequestExecutorDepsInterface['scope'];
  readonly #deadlineMs: number | undefined;
  readonly #fetchClient: FetchClientInterface;
  readonly #pipeline: RequestExecutorDepsInterface['pipeline'];
  readonly #retry: RetryInterface;
  readonly #signal: SignalInterface;

  protected readonly hooks: HookInvoker;

  protected constructor(deps: RequestExecutorDepsInterface) {
    this.#fetchClient = deps.fetchClient;
    this.#pipeline = deps.pipeline;
    this.#retry = deps.retry;
    this.#signal = deps.signal;
    this.#scope = deps.scope;
    this.#deadlineMs = deps.deadlineMs;
    this.hooks = new RequestExecutor.#OwnedHookInvoker();
  }

  /**
   * Runs `callback` against the composed FetchClient and a composed cancellation AbortSignal, wrapped
   * in the retry loop and, when configured, an isolated scope. An optional `OperationPipeline` surrounds the observed retry operation inside that scope. The retry loop is bracketed by the
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
    const parsedOptions = RequestExecutor.#intakeExecuteOptions(options);
    const deadlineMs = parsedOptions.data.deadlineMs ?? this.#deadlineMs;
    const composedSignal = await this.#signal.compose({
      ...(deadlineMs !== undefined ? { 'deadlineMs': deadlineMs } : {}),
      ...(parsedOptions.signal !== undefined ? { 'signal': parsedOptions.signal } : {})
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

    const operationContext: RequestExecutorOperationContextInterface = {
      'fetchClient': this.#fetchClient,
      'signal': composedSignal
    };
    const run = async (): Promise<T> => {
      if (this.#pipeline === undefined) {
        const result = await runObserved();
        return result;
      }

      const result = await this.#pipeline.run(operationContext, (): Promise<T> => {
        const observedResult = runObserved();
        return observedResult;
      });
      return result;
    };

    if (this.#scope === undefined) {
      const result = await run();
      return result;
    }

    const scope = this.#scope.initialize(parsedOptions.data.scopeInitial);

    try {
      const result = await scope.execute(run);
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
