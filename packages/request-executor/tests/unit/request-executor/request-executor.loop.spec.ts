import type { ErrorClassificationEntity } from '@studnicky/errors/entities';
import type { OperationFunctionInterface, OperationInterceptorInterface, OperationPipelineInterface } from '@studnicky/pipeline/interfaces';
import type { RetryConfigInterface, RetryContextInterface, RetryInterface } from '@studnicky/retry/interfaces';
import type { ComposedSignalInterface, SignalInterface } from '@studnicky/signal/interfaces';

import { RuntimeError } from '@studnicky/errors/node';
import { BrowserFetchClient } from '@studnicky/fetch/browser';
import { AbortError, type ClientConfigInterface, FetchClient, type RequestContextInterface, type ResponseContextInterface } from '@studnicky/fetch/node';
import * as OperationPipelineBrowserExports from '@studnicky/pipeline/browser';
import { OperationPipeline } from '@studnicky/pipeline/node';
import * as RequestExecutorBrowserExports from '@studnicky/request-executor/browser';
import * as RetryBrowserExports from '@studnicky/retry/browser';
import { RequestStatsEntity } from '@studnicky/retry/entities';
import { Retry } from '@studnicky/retry/node';
import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import { Signal } from '@studnicky/signal/browser';
import { BaseError } from '@studnicky/types/browser';
import assert from 'node:assert/strict';
import { afterEach, it } from 'node:test';

import type { RequestExecutorConfigInterface } from '../../../src/interfaces/RequestExecutorConfigInterface.js';
import type { RequestExecutorOperationContextInterface } from '../../../src/interfaces/RequestExecutorOperationContextInterface.js';
import type { RequestScopeFactoryInterface } from '../../../src/interfaces/RequestScopeFactoryInterface.js';
import type { RequestScopeInterface } from '../../../src/interfaces/RequestScopeInterface.js';
import type { RequestExecutorContextEntity } from './entities/RequestExecutorContextEntity.js';

import { RequestDeadlineEntity, RequestExecutorConfigDataEntity, RequestExecutorExecuteOptionsDataEntity } from '../../../src/entities/index.js';
import { RequestExecutor } from '../../../src/index.js';
import { RequestExecutorScenarioCaseEntity } from './entities/RequestExecutorScenarioCaseEntity.js';
import { RequestExecutorTestFixtures } from './helpers/RequestExecutorTestFixtures.js';
import scenarioGroups from './request-executor.scenarios.json' with { 'type': 'json' };

afterEach(() => {
  RequestExecutorTestFixtures.restoreFetch();
});


interface ScenarioRequestExecutorInputInterface {
  'context'?: RequestExecutorContextEntity.Type;
  'deadlineMs'?: number;
  'fetchClient'?: ClientConfigInterface;
  'retry'?: RetryConfigInterface;
}

interface HookCallInterface {
  readonly 'argumentList': readonly unknown[];
  readonly 'hook': string;
}

class TrackingRequestExecutor extends RequestExecutor {
  readonly hookCalls: HookCallInterface[] = [];

  static track(config: RequestExecutorConfigInterface): TrackingRequestExecutor {
    const result = this.create(config);
    if (!(result instanceof TrackingRequestExecutor)) {
      throw RuntimeError.create('Expected TrackingRequestExecutor instance');
    }
    return result;
  }

  protected override onExecuteStart(): void {
    this.hookCalls.push({ 'argumentList': [], 'hook': 'onExecuteStart' });
  }

  protected override onExecuteComplete(result: unknown): void {
    this.hookCalls.push({ 'argumentList': [result], 'hook': 'onExecuteComplete' });
  }

  protected override onExecuteError(error: Error): void {
    this.hookCalls.push({ 'argumentList': [error], 'hook': 'onExecuteError' });
  }
}

class ThrowingErrorHookRequestExecutor extends RequestExecutor {
  #hookFailureMessage = 'onExecuteError override failed';

  static thrown(config: RequestExecutorConfigInterface, hookFailureMessage: string): ThrowingErrorHookRequestExecutor {
    const result = this.create(config);
    if (!(result instanceof ThrowingErrorHookRequestExecutor)) {
      throw RuntimeError.create('Expected ThrowingErrorHookRequestExecutor instance');
    }
    result.#hookFailureMessage = hookFailureMessage;
    return result;
  }

  protected override onExecuteError(_error: Error): void {
    throw RuntimeError.create(this.#hookFailureMessage);
  }
}

class TestRequestScopeState {
  #active: Map<string, unknown> | undefined;

  public activate(values: Map<string, unknown>): void {
    this.#active = values;
  }

  public deactivate(values: Map<string, unknown>): void {
    if (this.#active === values) {
      this.#active = undefined;
    }
  }

  public get(key: string): unknown {
    const result = this.#active?.get(key);

    return result;
  }

  public set(key: string, value: unknown): void {
    this.#active?.set(key, value);
  }
}

class TestRequestScope implements RequestScopeInterface {
  readonly #state: TestRequestScopeState;
  readonly #values: Map<string, unknown>;

  public constructor(state: TestRequestScopeState, values: Map<string, unknown>) {
    this.#state = state;
    this.#values = values;
  }

  public execute<TResult>(callback: () => TResult): TResult {
    this.#state.activate(this.#values);
    const result = callback();

    return result;
  }

  public terminate(): void {
    this.#state.deactivate(this.#values);
  }
}

class TestRequestScopeFactory implements RequestScopeFactoryInterface {
  readonly #defaults: Readonly<Record<string, unknown>>;
  readonly #state = new TestRequestScopeState();

  public constructor(defaults: Record<string, unknown>) {
    this.#defaults = defaults;
  }

  public get(key: string): unknown {
    const result = this.#state.get(key);

    return result;
  }

  public initialize(initial?: Record<string, unknown>): RequestScopeInterface {
    const values = new Map(Object.entries({ ...this.#defaults, ...initial }));
    const result = new TestRequestScope(this.#state, values);

    return result;
  }

  public set(key: string, value: unknown): void {
    this.#state.set(key, value);
  }
}

class TrackingFetchClient extends FetchClient {
  readonly requestPaths: string[] = [];
  readonly responseStatuses: number[] = [];

  protected override onRequest(context: RequestContextInterface): Promise<RequestContextInterface> {
    this.requestPaths.push(context.metadata.path);
    const result = Promise.resolve(context);

    return result;
  }

  protected override onResponse(context: ResponseContextInterface): Promise<ResponseContextInterface> {
    this.responseStatuses.push(context.response.status);
    const result = Promise.resolve(context);

    return result;
  }
}

class TrackingRetry extends Retry {
  readonly attempts: number[] = [];
  readonly scheduledRetries: number[] = [];

  constructor(config?: RetryConfigInterface) {
    super(config ?? {});
  }

  protected override classifyError(_error: Error, _attemptNumber: number): ErrorClassificationEntity.Type {
    return { 'retryable': true };
  }

  protected override onAttempt(attemptNumber: number): void {
    this.attempts.push(attemptNumber);
  }

  protected override onRetryScheduled(context: RetryContextInterface): void {
    this.scheduledRetries.push(context.attemptNumber);
  }
}

class RequestExecutorScenarioFactories {
  static resolvePlainExecutorConfig(input?: ScenarioRequestExecutorInputInterface): RequestExecutorConfigInterface {
    const result = {
      'fetchClient': RequestExecutorScenarioFactories.createFetchClientFromScenario(input ?? {}),
      'retry': RequestExecutorScenarioFactories.createRetryFromScenario(input ?? {}),
      'signal': Signal.create(),
      ...(input?.context !== undefined ? { 'scope': new TestRequestScopeFactory(input.context) } : {}),
      ...(input?.deadlineMs !== undefined ? { 'deadlineMs': input.deadlineMs } : {})
    };

    return result;
  }

  static createFetchClientFromScenario(input: ScenarioRequestExecutorInputInterface): FetchClient {
    const result = FetchClient.create(input.fetchClient ?? {});

    return result;
  }

  static createRetryFromScenario(input: ScenarioRequestExecutorInputInterface): Retry {
    const result = Retry.create(input.retry);

    return result;
  }

  static requireContextFromScenario(input: ScenarioRequestExecutorInputInterface): TestRequestScopeFactory {
    if (input.context === undefined) {
      throw RuntimeError.create('Scenario input.requestExecutor.context is required');
    }
    const result = new TestRequestScopeFactory(input.context);

    return result;
  }
}

const resolvePlainExecutorConfig = RequestExecutorScenarioFactories.resolvePlainExecutorConfig;
const createFetchClientFromScenario = RequestExecutorScenarioFactories.createFetchClientFromScenario;
const createRetryFromScenario = RequestExecutorScenarioFactories.createRetryFromScenario;
const requireContextFromScenario = RequestExecutorScenarioFactories.requireContextFromScenario;


class RequestExecutorRunners {
  static async 'caller-owned-runtime-ports'(scenarioCase: Extract<RequestExecutorScenarioCaseEntity.Type, { 'shape': 'caller-owned-runtime-ports'; }>): Promise<void> {
    RequestExecutorTestFixtures.setFetch((): Promise<Response> => {
      const result = Promise.resolve(new Response(scenarioCase.input.fetchResponseText));

      return result;
    });

    const executor = RequestExecutor.create(resolvePlainExecutorConfig());
    const response = await executor.execute((client, signal) => {
      const result = client.get(scenarioCase.input.fetchUrl, { 'signal': signal });

      return result;
    });
    assert.equal(response.status, scenarioCase.expected.responseStatus);
    assert.equal(await response.text(), scenarioCase.expected.responseText);
  }

  static async 'cancellation-deadline-only'(scenarioCase: Extract<RequestExecutorScenarioCaseEntity.Type, { 'shape': 'cancellation-deadline-only'; }>): Promise<void> {
    RequestExecutorTestFixtures.setFetch(async (_input, init): Promise<Response> => {
      assert.equal(init?.signal?.aborted, false);
      await new Promise((resolve) => { setTimeout(resolve, scenarioCase.input.fetchDelayMs); });
      return new Response(scenarioCase.input.responseText);
    });

    const executor = RequestExecutor.create(resolvePlainExecutorConfig(scenarioCase.input.requestExecutor));

    let observedSignalAborted = false;
    const response = await executor.execute((client, signal) => {
      observedSignalAborted = signal.aborted;
      assert.equal(observedSignalAborted, false);
      const result = client.get(scenarioCase.input.fetchPath, { 'signal': signal });

      return result;
    });
    assert.equal(response.status, scenarioCase.expected.responseStatus);
    assert.equal(observedSignalAborted, scenarioCase.expected.signalAborted);
    assert.equal(await response.text(), scenarioCase.input.responseText);
  }

  static async 'cancellation-default-signal'(scenarioCase: Extract<RequestExecutorScenarioCaseEntity.Type, { 'shape': 'cancellation-default-signal'; }>): Promise<void> {
    RequestExecutorTestFixtures.setFetch(async (_input, init): Promise<Response> => {
      assert.equal(init?.signal?.aborted, false);
      await new Promise((resolve) => { setTimeout(resolve, scenarioCase.input.fetchDelayMs); });
      return new Response(scenarioCase.input.responseText);
    });

    const executor = RequestExecutor.create(resolvePlainExecutorConfig(scenarioCase.input.requestExecutor));

    let observedSignalAborted = false;
    const response = await executor.execute((client, signal) => {
      observedSignalAborted = signal.aborted;
      assert.equal(observedSignalAborted, false);
      const result = client.get(scenarioCase.input.fetchPath, { 'signal': signal });

      return result;
    });
    assert.equal(response.status, scenarioCase.expected.responseStatus);
    assert.equal(observedSignalAborted, scenarioCase.expected.signalAborted);
    assert.equal(await response.text(), scenarioCase.input.responseText);
  }

  static async 'cancellation-merged-signal'(scenarioCase: Extract<RequestExecutorScenarioCaseEntity.Type, { 'shape': 'cancellation-merged-signal'; }>): Promise<void> {
    RequestExecutorTestFixtures.setFetch((_input, init): Promise<Response> => {
      return new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        if (signal === undefined || signal === null) {
          return;
        }

        const abortError = new AbortError(scenarioCase.input.fetchPath);
        if (signal.aborted) {
          reject(abortError);
          return;
        }

        signal.addEventListener('abort', () => {
          reject(abortError);
        }, { 'once': true });
      });
    });

    const controller = new AbortController();
    setTimeout(() => { controller.abort(new AbortError(scenarioCase.input.fetchPath)); }, scenarioCase.input.abortAfterMs);
    const executor = RequestExecutor.create(resolvePlainExecutorConfig(scenarioCase.input.requestExecutor));

    const error = await RequestExecutorTestFixtures.captureRejectedError(
      executor.execute(
        (client, signal) => {
          const result = client.get(scenarioCase.input.fetchPath, { 'signal': signal });

          return result;
        },
        { 'signal': controller.signal }
      )
    );
    let current: Error | undefined = error;
    let foundAbort = false;
    while (current !== undefined) {
      if (current instanceof AbortError || current.name === 'AbortError') {
        foundAbort = true;
        break;
      }
      current = current.cause instanceof Error ? current.cause : undefined;
    }
    assert.equal(foundAbort, scenarioCase.expected.aborted);
  }

  static async 'context-roundtrip'(scenarioCase: Extract<RequestExecutorScenarioCaseEntity.Type, { 'shape': 'context-roundtrip'; }>): Promise<void> {
    RequestExecutorTestFixtures.setFetch((): Promise<Response> => {
      const result = Promise.resolve(new Response(scenarioCase.input.fetchResponseText));

      return result;
    });

    const context = requireContextFromScenario(scenarioCase.input.requestExecutor);
    const executor = RequestExecutor.create({
      ...resolvePlainExecutorConfig(scenarioCase.input.requestExecutor),
      'fetchClient': createFetchClientFromScenario(scenarioCase.input.requestExecutor),
      'retry': createRetryFromScenario(scenarioCase.input.requestExecutor),
      'scope': context
    });
    let observedRequestId: string | undefined;

    await executor.execute(async (client, signal) => {
      context.set('requestId', scenarioCase.input.contextValue);
      const requestId = context.get('requestId');
      if (typeof requestId !== 'string') {
        throw RuntimeError.create('Expected requestId context value to be a string');
      }
      observedRequestId = requestId;
      return await client.get('/', { 'signal': signal });
    });

    assert.equal(observedRequestId, scenarioCase.expected.observedRequestId);
  }

  static async 'context-seeded-values'(scenarioCase: Extract<RequestExecutorScenarioCaseEntity.Type, { 'shape': 'context-seeded-values'; }>): Promise<void> {
    RequestExecutorTestFixtures.setFetch((): Promise<Response> => {
      const result = Promise.resolve(new Response(scenarioCase.input.fetchResponseText));

      return result;
    });

    const context = requireContextFromScenario(scenarioCase.input.requestExecutor);
    const executor = RequestExecutor.create({
      ...resolvePlainExecutorConfig(scenarioCase.input.requestExecutor),
      'fetchClient': createFetchClientFromScenario(scenarioCase.input.requestExecutor),
      'retry': createRetryFromScenario(scenarioCase.input.requestExecutor),
      'scope': context
    });
    let observedSeed: number | undefined;

    await executor.execute(
      async (client, signal) => {
        const seed = context.get('seed');
        if (typeof seed !== 'number') {
          throw RuntimeError.create('Expected seed context value to be a number');
        }
        observedSeed = seed;
        return await client.get('/', { 'signal': signal });
      },
      { 'scopeInitial': { 'seed': scenarioCase.input.contextSeed } }
    );

    assert.equal(observedSeed, scenarioCase.expected.observedSeed);
  }

  static async 'create-plain-config'(scenarioCase: Extract<RequestExecutorScenarioCaseEntity.Type, { 'shape': 'create-plain-config'; }>): Promise<void> {
    RequestExecutorTestFixtures.setFetch((input, init): Promise<Response> => {
      assert.equal(String(input), scenarioCase.input.fetchInputUrl);
      assert.equal(String(input), scenarioCase.expected.requestUrl);
      assert.equal(init?.method, scenarioCase.input.fetchMethod);
      assert.equal(init?.method, scenarioCase.expected.requestMethod);
      const result = Promise.resolve(new Response(scenarioCase.input.fetchResponseText));

      return result;
    });

    const executor = RequestExecutor.create(resolvePlainExecutorConfig(scenarioCase.input.requestExecutor));

    const result = await executor.execute(async (client, signal) => {
      assert.ok(client instanceof FetchClient);
      assert.equal(signal.aborted, false);
      const response = await client.get(scenarioCase.input.requestPath, { 'signal': signal });
      const text = await response.text();
      assert.equal(text, scenarioCase.expected.responseText);
      return text;
    });

    assert.equal(result, scenarioCase.expected.result);
  }

  static async 'create-with-instances'(scenarioCase: Extract<RequestExecutorScenarioCaseEntity.Type, { 'shape': 'create-with-instances'; }>): Promise<void> {
    RequestExecutorTestFixtures.setFetch((): Promise<Response> => {
      const result = Promise.resolve(new Response('ok'));

      return result;
    });

    const fetchClient = createFetchClientFromScenario(scenarioCase.input.requestExecutor);
    const retry = createRetryFromScenario(scenarioCase.input.requestExecutor);
    const executor = RequestExecutor.create({
      ...resolvePlainExecutorConfig(scenarioCase.input.requestExecutor),
      'fetchClient': fetchClient,
      'retry': retry
    });

    let attempts = 0;
    let sameFetchClientObserved = false;
    const result = await executor.execute((client) => {
      assert.equal(client === fetchClient, true);
      sameFetchClientObserved = client === fetchClient;
      attempts += 1;
      if (attempts === 1) {
        throw RuntimeError.create(scenarioCase.input.retryFailOnceMessage);
      }
      const callbackResult = Promise.resolve(scenarioCase.expected.result);

      return callbackResult;
    });

    assert.equal(result, scenarioCase.expected.result);
    assert.equal(retry.getStats().totalRetries, scenarioCase.expected.retryTotalRetries);
    assert.equal(sameFetchClientObserved, scenarioCase.expected.sameFetchClient);
  }

  static 'entity-rejects-invalid-deadline'(scenarioCase: Extract<RequestExecutorScenarioCaseEntity.Type, { 'shape': 'entity-rejects-invalid-deadline'; }>): void {
    for (const value of scenarioCase.input.values) {
      assert.equal(RequestDeadlineEntity.validate(value), false);
    }
    assert.equal(scenarioCase.expected.accepted, false);
  }

  static 'entity-validates-deadlines'(scenarioCase: Extract<RequestExecutorScenarioCaseEntity.Type, { 'shape': 'entity-validates-deadlines'; }>): void {
    for (const value of scenarioCase.input.values) {
      assert.equal(RequestDeadlineEntity.validate(value), true);
    }
    assert.equal(scenarioCase.expected.accepted, true);
  }

  static async 'hooks-bracket-error'(scenarioCase: Extract<RequestExecutorScenarioCaseEntity.Type, { 'shape': 'hooks-bracket-error'; }>): Promise<void> {
    const executor = TrackingRequestExecutor.track(resolvePlainExecutorConfig(scenarioCase.input.requestExecutor));

    const error = await RequestExecutorTestFixtures.captureRejectedError(
      executor.execute(() => {
        throw RuntimeError.create(scenarioCase.input.errorMessage);
      })
    );
    RequestExecutorTestFixtures.assertErrorMessageIncludes(error, scenarioCase.input.errorMessage);
    assert.strictEqual(executor.hookCalls[1]?.argumentList[0], error);

    assert.deepStrictEqual(executor.hookCalls.map((call) => { return call.hook; }), scenarioCase.expected.hookNames);
    assert.equal(executor.hookErrorCount, 0);
  }

  static async 'hooks-bracket-retry-loop'(scenarioCase: Extract<RequestExecutorScenarioCaseEntity.Type, { 'shape': 'hooks-bracket-retry-loop'; }>): Promise<void> {
    let failuresRemaining = scenarioCase.input.fetchFailures;
    RequestExecutorTestFixtures.setFetch((input): Promise<Response> => {
      const inputUrl = String(input);
      try {
        const url = new URL(inputUrl);
        if (url.pathname === scenarioCase.input.fetchPath) {
          if (failuresRemaining > 0) {
            failuresRemaining -= 1;
            const response = new Response('fail', { 'status': 500 });
            const result = Promise.resolve(response);

            return result;
          }

          const response = new Response('ok');
          const result = Promise.resolve(response);

          return result;
        }

        const response = new Response('not found', { 'status': 404 });
        const result = Promise.resolve(response);

        return result;
      } catch (cause) {
        throw RuntimeError.create(`Cannot parse request URL ${inputUrl}`, { 'cause': cause });
      }
    });

    const executor = TrackingRequestExecutor.track(resolvePlainExecutorConfig(scenarioCase.input.requestExecutor));

    const response = await executor.execute(async (client, signal) => {
      const result = await client.get(scenarioCase.input.fetchPath, { 'signal': signal });
      if (!result.ok) {
        throw RuntimeError.create(`HTTP ${result.status}`);
      }
      return result;
    });

    assert.equal(response.status, scenarioCase.expected.responseStatus);
    assert.deepStrictEqual(executor.hookCalls.map((call) => { return call.hook; }), scenarioCase.expected.hookNames);
    assert.strictEqual(executor.hookCalls[0]?.argumentList.length, 0);
    assert.equal(executor.hookCalls[1]?.argumentList[0] === response, true);
    assert.equal(executor.hookErrorCount, 0);
  }

  static async 'hooks-error-not-swallowed'(scenarioCase: Extract<RequestExecutorScenarioCaseEntity.Type, { 'shape': 'hooks-error-not-swallowed'; }>): Promise<void> {
    const executor = ThrowingErrorHookRequestExecutor.thrown(
      resolvePlainExecutorConfig(scenarioCase.input.requestExecutor),
      scenarioCase.input.hookFailureMessage
    );

    const error = await RequestExecutorTestFixtures.captureRejectedError(
      executor.execute(() => {
        throw RuntimeError.create(scenarioCase.input.errorMessage);
      })
    );
    // A throwing onExecuteError override must not replace the request failure it
    // observes — the original error, not the hook's HookInvocationError, propagates.
    RequestExecutorTestFixtures.assertErrorMessageIncludes(error, scenarioCase.input.errorMessage);

    assert.equal(executor.hookErrorCount, scenarioCase.expected.hookErrorCount);
    assert.equal(executor.getHookErrors()[0]?.hookName, scenarioCase.expected.hookErrorName);
  }

  static async 'hooks-fire-through-executor'(scenarioCase: Extract<RequestExecutorScenarioCaseEntity.Type, { 'shape': 'hooks-fire-through-executor'; }>): Promise<void> {
    let failuresRemaining = scenarioCase.input.fetchFailures;
    RequestExecutorTestFixtures.setFetch((input): Promise<Response> => {
      const inputUrl = String(input);
      try {
        const url = new URL(inputUrl);
        if (url.pathname === scenarioCase.input.fetchPath) {
          if (failuresRemaining > 0) {
            failuresRemaining -= 1;
            const response = new Response('fail', { 'status': 500 });
            const result = Promise.resolve(response);

            return result;
          }

          const response = new Response('ok');
          const result = Promise.resolve(response);

          return result;
        }

        const response = new Response('not found', { 'status': 404 });
        const result = Promise.resolve(response);

        return result;
      } catch (cause) {
        throw RuntimeError.create(`Cannot parse request URL ${inputUrl}`, { 'cause': cause });
      }
    });

    const fetchClient = TrackingFetchClient.create(scenarioCase.input.requestExecutor.fetchClient ?? {});
    const retry = new TrackingRetry(scenarioCase.input.requestExecutor.retry);
    const executor = RequestExecutor.create({ 'fetchClient': fetchClient, 'retry': retry, 'signal': Signal.create() });

    const response = await executor.execute(async (client, signal) => {
      const result = await client.get(scenarioCase.input.fetchPath, { 'signal': signal });
      if (!result.ok) {
        throw RuntimeError.create(`HTTP ${result.status}`);
      }
      return result;
    });

    assert.equal(response.status, scenarioCase.expected.responseStatus);
    assert.equal(await response.text(), scenarioCase.expected.responseText);
    assert.deepStrictEqual(fetchClient.requestPaths, scenarioCase.expected.requestPaths);
    assert.deepStrictEqual(fetchClient.responseStatuses, scenarioCase.expected.responseStatuses);
    assert.deepStrictEqual(retry.attempts, scenarioCase.expected.retryAttempts);
    assert.deepStrictEqual(retry.scheduledRetries, scenarioCase.expected.scheduledRetries);
  }

  static async 'hooks-noop-default'(scenarioCase: Extract<RequestExecutorScenarioCaseEntity.Type, { 'shape': 'hooks-noop-default'; }>): Promise<void> {
    RequestExecutorTestFixtures.setFetch((): Promise<Response> => {
      const response = new Response(scenarioCase.input.fetchResponseText);
      const result = Promise.resolve(response);

      return result;
    });

    const executor = RequestExecutor.create(resolvePlainExecutorConfig());
    const response = await executor.execute((client, signal) => {
      const result = client.get(scenarioCase.input.fetchUrl, { 'signal': signal });

      return result;
    });

    assert.equal(response.status, scenarioCase.expected.responseStatus);
    assert.equal(await response.text(), scenarioCase.expected.responseText);
    assert.equal(executor.hookErrorCount, scenarioCase.expected.hookErrorCount);
    assert.deepStrictEqual(executor.getHookErrors(), []);
  }
};


class RequestExecutorAdditionalTests {
  static declares(): void {
    RequestExecutorAdditionalTests.declaresConstructorDataIntake();
    RequestExecutorAdditionalTests.declaresConstructorDataRejection();
    RequestExecutorAdditionalTests.declaresExecuteOptionsIntake();
    RequestExecutorAdditionalTests.declaresExecuteOptionsRejection();
    RequestExecutorAdditionalTests.declaresOrderedPolicies();
    RequestExecutorAdditionalTests.declaresScopedPolicies();
    RequestExecutorAdditionalTests.declaresTerminalFailurePropagation();
    RequestExecutorAdditionalTests.declaresStructuralPipeline();
    RequestExecutorAdditionalTests.declaresBrowserPorts();
    RequestExecutorAdditionalTests.declaresStructuralRetryAndSignalPorts();
  }

  static declaresConstructorDataIntake(): void {
    void it('intakes serializable constructor data without mutating caller configuration', () => {
      const data = { 'deadlineMs': undefined };
      const parsed = RequestExecutorConfigDataEntity.intake(data);
      assert.deepStrictEqual(parsed, {});
      assert.deepStrictEqual(data, { 'deadlineMs': undefined });
      const executor = RequestExecutor.create({ 'deadlineMs': undefined, 'fetchClient': FetchClient.create(), 'retry': Retry.create({ 'maximumRetries': 0 }), 'signal': Signal.create() });
      assert.ok(executor instanceof RequestExecutor);
    });
  }

  static declaresConstructorDataRejection(): void {
    void it('rejects undeclared and invalid constructor configuration through entity intake', () => {
      const withUnknownKey = { 'fetchClient': FetchClient.create(), 'retry': Retry.create({ 'maximumRetries': 0 }), 'signal': Signal.create(), 'unexpected': true };
      const withInvalidDeadline = { 'deadlineMs': -1, 'fetchClient': FetchClient.create(), 'retry': Retry.create({ 'maximumRetries': 0 }), 'signal': Signal.create() };
      assert.throws(() => { RequestExecutor.create(withUnknownKey); });
      assert.throws(() => { RequestExecutor.create(withInvalidDeadline); });
    });
  }

  static declaresExecuteOptionsIntake(): void {
    void it('intakes per-call data while preserving declared runtime signal composition', async () => {
      const data = { 'deadlineMs': undefined, 'scopeInitial': undefined };
      const parsed = RequestExecutorExecuteOptionsDataEntity.intake(data);
      assert.deepStrictEqual(parsed, {});
      assert.deepStrictEqual(data, { 'deadlineMs': undefined, 'scopeInitial': undefined });
      const controller = new AbortController();
      const signalProvider: SignalInterface = { 'compose': async function (options): Promise<ComposedSignalInterface> {
        assert.equal(options.signal === controller.signal, true);
        const result = await Signal.create().compose(options);
        return result;
      } };
      const executor = RequestExecutor.create({ 'fetchClient': FetchClient.create(), 'retry': Retry.create({ 'maximumRetries': 0 }), 'signal': signalProvider });
      const result = await executor.execute((_client, requestSignal): Promise<string> => {
        assert.equal(requestSignal === controller.signal, true);
        const callbackResult = Promise.resolve('completed');
        return callbackResult;
      }, { 'deadlineMs': undefined, 'signal': controller.signal });
      assert.equal(result, 'completed');
    });
  }

  static declaresExecuteOptionsRejection(): void {
    void it('rejects undeclared and non-JSON per-call data through entity intake', () => {
      const withUnknownKey = { 'unexpected': true };
      const withInvalidScopeValue = { 'scopeInitial': null };
      assert.equal(RequestExecutorExecuteOptionsDataEntity.validate(withUnknownKey), false);
      assert.equal(RequestExecutorExecuteOptionsDataEntity.validate(withInvalidScopeValue), false);
    });
  }

  static declaresOrderedPolicies(): void {
    void it('runs ordered operation policies around the full retried execution', async () => {
      const events: string[] = [];
      const contexts: RequestExecutorOperationContextInterface[] = [];
      let callbackSignal: AbortSignal | undefined;
      const outer: OperationInterceptorInterface<RequestExecutorOperationContextInterface> = async (context, next) => { contexts.push(context); events.push('outer:before'); const result = await next(context); events.push('outer:after'); return result; };
      const inner: OperationInterceptorInterface<RequestExecutorOperationContextInterface> = async (context, next) => { contexts.push(context); events.push('inner:before'); const result = await next(context); events.push('inner:after'); return result; };
      const fetchClient = FetchClient.create();
      const retry = new TrackingRetry({ 'maximumRetries': 1 });
      const executor = RequestExecutor.create({ 'fetchClient': fetchClient, 'pipeline': OperationPipeline.create([outer, inner]), 'retry': retry, 'signal': Signal.create() });
      let callbackAttempts = 0;
      const result = await executor.execute((client, signal): Promise<string> => {
        assert.equal(client === fetchClient, true);
        callbackSignal = signal;
        callbackAttempts += 1;
        events.push(['callback', String(callbackAttempts)].join(':'));
        if (callbackAttempts === 1) {
          throw RuntimeError.create('retry once');
        }
        const callbackResult = Promise.resolve('completed');
        return callbackResult;
      });
      assert.equal(result, 'completed');
      assert.deepStrictEqual(events, ['outer:before', 'inner:before', 'callback:1', 'callback:2', 'inner:after', 'outer:after']);
      assert.deepStrictEqual(retry.attempts, [0, 1]);
      assert.equal(contexts[0]?.fetchClient === fetchClient, true);
      assert.equal(contexts[0]?.signal === callbackSignal, true);
      assert.equal(contexts[1]?.fetchClient === fetchClient, true);
      assert.equal(contexts[1]?.signal === callbackSignal, true);
    });
  }

  static declaresScopedPolicies(): void {
    void it('runs operation policies inside the configured scope', async () => {
      const scope = new TestRequestScopeFactory({ 'requestId': 'request-42' });
      let policyRequestId: unknown;
      const policy: OperationInterceptorInterface<RequestExecutorOperationContextInterface> = async (context, next) => { policyRequestId = scope.get('requestId'); const result = await next(context); return result; };
      const executor = RequestExecutor.create({ 'fetchClient': FetchClient.create(), 'pipeline': OperationPipeline.create([policy]), 'retry': Retry.create({ 'maximumRetries': 0 }), 'scope': scope, 'signal': Signal.create() });
      const result = await executor.execute((): Promise<string> => { const callbackResult = Promise.resolve('completed'); return callbackResult; });
      assert.equal(result, 'completed');
      assert.equal(policyRequestId, 'request-42');
    });
  }

  static declaresTerminalFailurePropagation(): void {
    void it('propagates the terminal retry failure unchanged through operation policies', async () => {
      const events: string[] = [];
      const callbackFailure = RuntimeError.create('callback failure');
      let terminalFailure: BaseError | undefined;
      const policy: OperationInterceptorInterface<RequestExecutorOperationContextInterface> = async (context, next) => {
        events.push('policy:before');
        try {
          const result = await next(context);
          events.push('policy:after');

          return result;
        } catch (error) {
          if (!(error instanceof BaseError)) {
            throw RuntimeError.create('Expected policy to observe a BaseError', { 'cause': error });
          }
          terminalFailure = error;
          throw error;
        }
      };
      const executor = RequestExecutor.create({ 'fetchClient': FetchClient.create(), 'pipeline': OperationPipeline.create([policy]), 'retry': Retry.create({ 'maximumRetries': 0 }), 'signal': Signal.create() });
      const execution = executor.execute((): Promise<never> => { const callbackResult = Promise.reject<never>(callbackFailure); return callbackResult; });
      const observed = await RequestExecutorTestFixtures.captureRejectedError(execution);
      assert.equal(observed === terminalFailure, true);
      RequestExecutorTestFixtures.assertErrorMessageIncludes(observed, callbackFailure.message);
      assert.deepStrictEqual(events, ['policy:before']);
    });
  }

  static declaresStructuralPipeline(): void {
    void it('accepts a structural operation pipeline contract', async () => {
      class StructuralPipeline implements OperationPipelineInterface<RequestExecutorOperationContextInterface> {
        readonly contexts: RequestExecutorOperationContextInterface[] = [];
        run<TResult>(context: RequestExecutorOperationContextInterface, operation: OperationFunctionInterface<RequestExecutorOperationContextInterface, TResult>): Promise<TResult> { this.contexts.push(context); const result = Promise.resolve(operation(context)); return result; }
      }
      const fetchClient = FetchClient.create();
      const pipeline = new StructuralPipeline();
      const executor = RequestExecutor.create({ 'fetchClient': fetchClient, 'pipeline': pipeline, 'retry': Retry.create({ 'maximumRetries': 0 }), 'signal': Signal.create() });
      const result = await executor.execute((client, signal): Promise<string> => { assert.equal(client === fetchClient, true); assert.equal(signal === pipeline.contexts[0]?.signal, true); const callbackResult = Promise.resolve('completed'); return callbackResult; });
      assert.equal(result, 'completed');
      assert.equal(pipeline.contexts.length, 1);
      assert.equal(pipeline.contexts[0]?.fetchClient === fetchClient, true);
    });
  }

  static declaresBrowserPorts(): void {
    void it('executes browser runtime ports from public browser exports', async () => {
      RequestExecutorTestFixtures.setFetch((): Promise<Response> => { const result = Promise.resolve(new Response('browser-ready')); return result; });
      const executor = RequestExecutorBrowserExports.RequestExecutor.create({ 'fetchClient': BrowserFetchClient.create({ 'baseURL': 'https://example.test' }), 'pipeline': OperationPipelineBrowserExports.OperationPipeline.create([]), 'retry': RetryBrowserExports.Retry.create({ 'maximumRetries': 0 }), 'signal': Signal.create() });
      const response = await executor.execute((client, signal) => { const result = client.get('/health', { 'signal': signal }); return result; });
      assert.equal(response.status, 200);
      assert.equal(await response.text(), 'browser-ready');
    });
  }

  static declaresStructuralRetryAndSignalPorts(): void {
    void it('accepts structural retry and signal ports', async () => {
      class StructuralRetry implements RetryInterface {
        public async execute<TResult>(operation: () => Promise<TResult>): Promise<TResult> {
          const result = await operation();

          return result;
        }

        public getStats() {
          const result = RequestStatsEntity.create({ 'failedRequests': 0, 'successfulRequests': 0, 'totalRequests': 0, 'totalRetries': 0 });

          return result;
        }

        public resetStats(): void { }
      }

      class StructuralSignal implements SignalInterface {
        public composeCount = 0;

        public async compose(options: Parameters<SignalInterface['compose']>[0]): Promise<ComposedSignalInterface> {
          this.composeCount += 1;
          const result = await Signal.create().compose(options);

          return result;
        }
      }

      const signal = new StructuralSignal();
      const executor = RequestExecutor.create({ 'fetchClient': FetchClient.create(), 'retry': new StructuralRetry(), 'signal': signal });
      const result = await executor.execute((_client, abortSignal): Promise<string> => { assert.equal(abortSignal.aborted, false); const callbackResult = Promise.resolve('completed'); return callbackResult; });
      assert.equal(result, 'completed');
      assert.equal(signal.composeCount, 1);
    });
  }
}

RequestExecutorAdditionalTests.declaresConstructorDataIntake();
RequestExecutorAdditionalTests.declaresConstructorDataRejection();
RequestExecutorAdditionalTests.declaresExecuteOptionsIntake();
RequestExecutorAdditionalTests.declaresExecuteOptionsRejection();
RequestExecutorAdditionalTests.declaresOrderedPolicies();
RequestExecutorAdditionalTests.declaresScopedPolicies();
RequestExecutorAdditionalTests.declaresTerminalFailurePropagation();
RequestExecutorAdditionalTests.declaresStructuralPipeline();
RequestExecutorAdditionalTests.declaresBrowserPorts();
RequestExecutorAdditionalTests.declaresStructuralRetryAndSignalPorts();

ScenarioSuite.register({
  'entity': RequestExecutorScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'RequestExecutor',
  'runners': RequestExecutorRunners
});
