import { RuntimeError } from '@studnicky/errors';
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import type { ErrorClassificationEntity } from '@studnicky/errors/entities';
import { AbortError, type ClientConfigInterface, type RequestContextInterface, type ResponseContextInterface } from '@studnicky/fetch';
import { FetchClient } from '@studnicky/fetch/node';
import { Retry } from '@studnicky/retry';
import type { RetryContextInterface, RetryConfigInterface } from '@studnicky/retry/interfaces';

import { RequestExecutor } from '../../../src/index.js';
import { RequestDeadlineEntity } from '../../../src/entities/index.js';
import type { RequestExecutorConfigInterface } from '../../../src/interfaces/RequestExecutorConfigInterface.js';
import type { RequestScopeFactoryInterface } from '../../../src/interfaces/RequestScopeFactoryInterface.js';
import type { RequestScopeInterface } from '../../../src/interfaces/RequestScopeInterface.js';
import scenarioGroups from './request-executor.scenarios.json' with { type: 'json' };

interface ScenarioRequestExecutorInputInterface {
  context?: { name: string };
  deadlineMs?: number;
  fetchClient?: ClientConfigInterface;
  retry?: RetryConfigInterface;
}

function assertErrorMessageIncludes(error: Error, expectedMessage: string): void {
  assert.equal(error.message.includes(expectedMessage), true);
}

async function captureRejectedError<T>(promise: Promise<T>): Promise<Error> {
  try {
    await promise;
  } catch (error) {
    assert.ok(error instanceof Error);
    return error;
  }

  assert.fail('Expected promise to reject');
}

type ScenarioCase =
  | {
      description: string;
      expected: { accepted: true };
      input: { values: Array<Record<string, unknown>> };
      shape: 'entity-validates-deadlines';
      name: string;
    }
  | {
      description: string;
      expected: { accepted: false };
      input: { values: Array<Record<string, unknown>> };
      shape: 'entity-rejects-invalid-deadline';
      name: string;
    }
  | {
      description: string;
      expected: { requestMethod: 'GET'; requestUrl: string; responseText: string; result: string };
      input: {
        fetchInputUrl: string;
        fetchMethod: 'GET';
        fetchResponseText: string;
        requestPath: string;
        requestExecutor: ScenarioRequestExecutorInputInterface;
      };
      shape: 'create-plain-config';
      name: string;
    }
  | {
      description: string;
      expected: { result: string; retryTotalRetries: number; sameFetchClient: true };
      input: {
        requestExecutor: ScenarioRequestExecutorInputInterface;
        retryFailOnceMessage: string;
      };
      shape: 'create-with-instances';
      name: string;
    }
  | {
      description: string;
      expected: { responseStatus: number; responseText: string };
      input: { fetchResponseText: string; fetchUrl: string };
      shape: 'defaults-real-primitives';
      name: string;
    }
  | {
      description: string;
      expected: { observedRequestId: string };
      input: { contextValue: string; fetchResponseText: string; requestExecutor: ScenarioRequestExecutorInputInterface };
      shape: 'context-roundtrip';
      name: string;
    }
  | {
      description: string;
      expected: { observedSeed: number };
      input: { contextSeed: number; fetchResponseText: string; requestExecutor: ScenarioRequestExecutorInputInterface };
      shape: 'context-seeded-values';
      name: string;
    }
  | {
      description: string;
      expected: { aborted: true };
      input: {
        abortAfterMs: number;
        fetchPath: string;
        requestExecutor: ScenarioRequestExecutorInputInterface;
      };
      shape: 'cancellation-merged-signal';
      name: string;
    }
  | {
      description: string;
      expected: { responseStatus: number; signalAborted: false };
      input: { fetchDelayMs: number; fetchPath: string; requestExecutor: ScenarioRequestExecutorInputInterface; responseText: string };
      shape: 'cancellation-default-signal';
      name: string;
    }
  | {
      description: string;
      expected: { responseStatus: number; signalAborted: false };
      input: { fetchDelayMs: number; fetchPath: string; requestExecutor: ScenarioRequestExecutorInputInterface; responseText: string };
      shape: 'cancellation-deadline-only';
      name: string;
    }
  | {
      description: string;
      expected: { hookNames: string[]; responseStatus: number };
      input: { fetchFailures: number; fetchPath: string; requestExecutor: ScenarioRequestExecutorInputInterface };
      shape: 'hooks-bracket-retry-loop';
      name: string;
    }
  | {
      description: string;
      expected: { errorMessage: string; hookNames: string[] };
      input: { errorMessage: string; requestExecutor: ScenarioRequestExecutorInputInterface };
      shape: 'hooks-bracket-error';
      name: string;
    }
  | {
      description: string;
      expected: { errorMessage: string; hookErrorCount: number; hookErrorName: string };
      input: { errorMessage: string; hookFailureMessage: string; requestExecutor: ScenarioRequestExecutorInputInterface };
      shape: 'hooks-error-not-swallowed';
      name: string;
    }
  | {
      description: string;
      expected: { hookErrorCount: number; responseStatus: number; responseText: string };
      input: { fetchResponseText: string; fetchUrl: string };
      shape: 'hooks-noop-default';
      name: string;
    }
  | {
      description: string;
      expected: {
        requestPaths: string[];
        responseStatuses: number[];
        retryAttempts: number[];
        scheduledRetries: number[];
        responseStatus: number;
        responseText: string;
      };
      input: { fetchFailures: number; fetchPath: string; requestExecutor: ScenarioRequestExecutorInputInterface };
      shape: 'hooks-fire-through-executor';
      name: string;
    };

const originalFetch = globalThis.fetch;

void afterEach(() => {
  globalThis.fetch = originalFetch;
});

function setFetch(handler: typeof fetch): void {
  globalThis.fetch = handler;
}

interface HookCallInterface {
  readonly args: readonly unknown[];
  readonly hook: string;
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
    this.hookCalls.push({ 'args': [], 'hook': 'onExecuteStart' });
  }

  protected override onExecuteComplete<T>(result: T): void {
    this.hookCalls.push({ 'args': [result], 'hook': 'onExecuteComplete' });
  }

  protected override onExecuteError(error: Error): void {
    this.hookCalls.push({ 'args': [error], 'hook': 'onExecuteError' });
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

class TestRequestScope implements RequestScopeInterface {
  readonly #factory: TestRequestScopeFactory;
  readonly #values: Map<string, unknown>;

  public constructor(factory: TestRequestScopeFactory, values: Map<string, unknown>) {
    this.#factory = factory;
    this.#values = values;
  }

  public execute<TResult>(callback: () => TResult): TResult {
    this.#factory.activate(this.#values);
    const result = callback();

    return result;
  }

  public terminate(): void {
    this.#factory.deactivate(this.#values);
  }
}

class TestRequestScopeFactory implements RequestScopeFactoryInterface {
  readonly #defaults: Readonly<Record<string, unknown>>;
  #active: Map<string, unknown> | undefined;

  public constructor(defaults: Record<string, unknown>) {
    this.#defaults = defaults;
  }

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

  public initialize(initial?: Record<string, unknown>): RequestScopeInterface {
    const values = new Map(Object.entries({ ...this.#defaults, ...initial }));
    const result = new TestRequestScope(this, values);

    return result;
  }

  public set(key: string, value: unknown): void {
    this.#active?.set(key, value);
  }
}

class TrackingFetchClient extends FetchClient {
  readonly requestPaths: string[] = [];
  readonly responseStatuses: number[] = [];

  protected override async onRequest(context: RequestContextInterface): Promise<RequestContextInterface> {
    this.requestPaths.push(context.metadata.path);
    return context;
  }

  protected override async onResponse(context: ResponseContextInterface): Promise<ResponseContextInterface> {
    this.responseStatuses.push(context.response.status);
    return context;
  }
}

class TrackingRetry extends Retry {
  readonly attempts: number[] = [];
  readonly scheduledRetries: number[] = [];

  constructor(config?: RetryConfigInterface) {
    super(config ?? {});
  }

  protected override classifyError(_error: Error, _attemptNumber: number): ErrorClassificationEntity.Type {
    return { retryable: true };
  }

  protected override onAttempt(attemptNumber: number): void {
    this.attempts.push(attemptNumber);
  }

  protected override onRetryScheduled(context: RetryContextInterface): void {
    this.scheduledRetries.push(context.attemptNumber);
  }
}

function resolvePlainExecutorConfig(input?: ScenarioRequestExecutorInputInterface): RequestExecutorConfigInterface {
  return {
    'fetchClient': createFetchClientFromScenario(input ?? {}),
    ...(input?.context !== undefined ? { scope: new TestRequestScopeFactory(input.context) } : {}),
    ...(input?.deadlineMs !== undefined ? { deadlineMs: input.deadlineMs } : {}),
    ...(input?.retry !== undefined ? { retry: input.retry } : {})
  };
}

function createFetchClientFromScenario(input: ScenarioRequestExecutorInputInterface): FetchClient {
  return FetchClient.create(input.fetchClient ?? {});
}

function createRetryFromScenario(input: ScenarioRequestExecutorInputInterface): Retry {
  return Retry.create(input.retry);
}

function requireContextFromScenario(input: ScenarioRequestExecutorInputInterface): TestRequestScopeFactory {
  if (input.context === undefined) {
    throw RuntimeError.create('Scenario input.requestExecutor.context is required');
  }
  return new TestRequestScopeFactory(input.context);
}

type ScenarioRunner<K extends ScenarioCase['shape']> =
  (scenarioCase: Extract<ScenarioCase, { shape: K }>) => Promise<void>;
type RunnerMap = { [K in ScenarioCase['shape']]: ScenarioRunner<K> };

const runnerMap: RunnerMap = {
  'entity-validates-deadlines': async (scenarioCase) => {
    for (const value of scenarioCase.input.values) {
      assert.equal(RequestDeadlineEntity.validate(value), true);
    }
    assert.equal(scenarioCase.expected.accepted, true);
  },

  'entity-rejects-invalid-deadline': async (scenarioCase) => {
    for (const value of scenarioCase.input.values) {
      assert.equal(RequestDeadlineEntity.validate(value), false);
    }
    assert.equal(scenarioCase.expected.accepted, false);
  },

  'create-plain-config': async (scenarioCase) => {
    setFetch(async (input, init): Promise<Response> => {
      assert.equal(String(input), scenarioCase.input.fetchInputUrl);
      assert.equal(String(input), scenarioCase.expected.requestUrl);
      assert.equal(init?.method, scenarioCase.input.fetchMethod);
      assert.equal(init?.method, scenarioCase.expected.requestMethod);
      return new Response(scenarioCase.input.fetchResponseText);
    });

    const executor = RequestExecutor.create(resolvePlainExecutorConfig(scenarioCase.input.requestExecutor));

    const result = await executor.execute(async (client, signal) => {
      assert.ok(client instanceof FetchClient);
      assert.equal(signal.aborted, false);
      const response = await client.get(scenarioCase.input.requestPath, { signal });
      const text = await response.text();
      assert.equal(text, scenarioCase.expected.responseText);
      return text;
    });

    assert.equal(result, scenarioCase.expected.result);
  },

  'create-with-instances': async (scenarioCase) => {
    setFetch(async (): Promise<Response> => {
      return new Response('ok');
    });

    const fetchClient = createFetchClientFromScenario(scenarioCase.input.requestExecutor);
    const retry = createRetryFromScenario(scenarioCase.input.requestExecutor);
    const executor = RequestExecutor.create({
      ...resolvePlainExecutorConfig(scenarioCase.input.requestExecutor),
      fetchClient,
      retry
    });

    let attempts = 0;
    let sameFetchClientObserved = false;
    const result = await executor.execute(async (client) => {
      assert.strictEqual(client, fetchClient);
      sameFetchClientObserved = client === fetchClient;
      attempts += 1;
      if (attempts === 1) {
        throw RuntimeError.create(scenarioCase.input.retryFailOnceMessage);
      }
      return scenarioCase.expected.result;
    });

    assert.equal(result, scenarioCase.expected.result);
    assert.equal(retry.getStats().totalRetries, scenarioCase.expected.retryTotalRetries);
    assert.equal(sameFetchClientObserved, scenarioCase.expected.sameFetchClient);
  },

  'defaults-real-primitives': async (scenarioCase) => {
    setFetch(async (): Promise<Response> => {
      return new Response(scenarioCase.input.fetchResponseText);
    });

    const executor = RequestExecutor.create({ 'fetchClient': FetchClient.create() });
    const response = await executor.execute((client, signal) => client.get(scenarioCase.input.fetchUrl, { signal }));
    assert.equal(response.status, scenarioCase.expected.responseStatus);
    assert.equal(await response.text(), scenarioCase.expected.responseText);
  },

  'context-roundtrip': async (scenarioCase) => {
    setFetch(async (): Promise<Response> => {
      return new Response(scenarioCase.input.fetchResponseText);
    });

    const context = requireContextFromScenario(scenarioCase.input.requestExecutor);
    const executor = RequestExecutor.create({
      ...resolvePlainExecutorConfig(scenarioCase.input.requestExecutor),
      'scope': context,
      fetchClient: createFetchClientFromScenario(scenarioCase.input.requestExecutor),
      retry: createRetryFromScenario(scenarioCase.input.requestExecutor)
    });
    let observedRequestId: string | undefined;

    await executor.execute(async (client, signal) => {
      context.set('requestId', scenarioCase.input.contextValue);
      const requestId = context.get('requestId');
      if (typeof requestId !== 'string') {
        throw RuntimeError.create('Expected requestId context value to be a string');
      }
      observedRequestId = requestId;
      return client.get('/', { signal });
    });

    assert.equal(observedRequestId, scenarioCase.expected.observedRequestId);
  },

  'context-seeded-values': async (scenarioCase) => {
    setFetch(async (): Promise<Response> => {
      return new Response(scenarioCase.input.fetchResponseText);
    });

    const context = requireContextFromScenario(scenarioCase.input.requestExecutor);
    const executor = RequestExecutor.create({
      ...resolvePlainExecutorConfig(scenarioCase.input.requestExecutor),
      'scope': context,
      fetchClient: createFetchClientFromScenario(scenarioCase.input.requestExecutor),
      retry: createRetryFromScenario(scenarioCase.input.requestExecutor)
    });
    let observedSeed: number | undefined;

    await executor.execute(
      async (client, signal) => {
        const seed = context.get('seed');
        if (typeof seed !== 'number') {
          throw RuntimeError.create('Expected seed context value to be a number');
        }
        observedSeed = seed;
        return client.get('/', { signal });
      },
      { scopeInitial: { seed: scenarioCase.input.contextSeed } }
    );

    assert.equal(observedSeed, scenarioCase.expected.observedSeed);
  },

  'cancellation-merged-signal': async (scenarioCase) => {
    setFetch((_input, init): Promise<Response> => {
      return new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        if (signal === undefined || signal === null) {
          return;
        }

        if (signal.aborted) {
          reject(signal.reason instanceof Error ? signal.reason : new DOMException('Aborted', 'AbortError'));
          return;
        }

        void signal.addEventListener('abort', () => {
          reject(signal.reason instanceof Error ? signal.reason : new DOMException('Aborted', 'AbortError'));
        }, { once: true });
      });
    });

    const controller = new AbortController();
    setTimeout(() => { controller.abort(); }, scenarioCase.input.abortAfterMs);
    const executor = RequestExecutor.create(resolvePlainExecutorConfig(scenarioCase.input.requestExecutor));

    const error = await captureRejectedError(
      executor.execute(
        (client, signal) => client.get(scenarioCase.input.fetchPath, { signal }),
        { signal: controller.signal }
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
  },

  'cancellation-default-signal': async (scenarioCase) => {
    setFetch(async (_input, init): Promise<Response> => {
      assert.equal(init?.signal?.aborted, false);
      await new Promise((resolve) => { setTimeout(resolve, scenarioCase.input.fetchDelayMs); });
      return new Response(scenarioCase.input.responseText);
    });

    const executor = RequestExecutor.create(resolvePlainExecutorConfig(scenarioCase.input.requestExecutor));

    let observedSignalAborted = false;
    const response = await executor.execute((client, signal) => {
      observedSignalAborted = signal.aborted;
      assert.equal(observedSignalAborted, false);
      return client.get(scenarioCase.input.fetchPath, { signal });
    });
    assert.equal(response.status, scenarioCase.expected.responseStatus);
    assert.equal(observedSignalAborted, scenarioCase.expected.signalAborted);
    assert.equal(await response.text(), scenarioCase.input.responseText);
  },

  'cancellation-deadline-only': async (scenarioCase) => {
    setFetch(async (_input, init): Promise<Response> => {
      assert.equal(init?.signal?.aborted, false);
      await new Promise((resolve) => { setTimeout(resolve, scenarioCase.input.fetchDelayMs); });
      return new Response(scenarioCase.input.responseText);
    });

    const executor = RequestExecutor.create(resolvePlainExecutorConfig(scenarioCase.input.requestExecutor));

    let observedSignalAborted = false;
    const response = await executor.execute((client, signal) => {
      observedSignalAborted = signal.aborted;
      assert.equal(observedSignalAborted, false);
      return client.get(scenarioCase.input.fetchPath, { signal });
    });
    assert.equal(response.status, scenarioCase.expected.responseStatus);
    assert.equal(observedSignalAborted, scenarioCase.expected.signalAborted);
    assert.equal(await response.text(), scenarioCase.input.responseText);
  },

  'hooks-bracket-retry-loop': async (scenarioCase) => {
    let failuresRemaining = scenarioCase.input.fetchFailures;
    setFetch(async (input): Promise<Response> => {
      const url = new URL(String(input));
      if (url.pathname === scenarioCase.input.fetchPath) {
        if (failuresRemaining > 0) {
          failuresRemaining -= 1;
          return new Response('fail', { status: 500 });
        }

        return new Response('ok');
      }

      return new Response('not found', { status: 404 });
    });

    const executor = TrackingRequestExecutor.track(resolvePlainExecutorConfig(scenarioCase.input.requestExecutor));

    const response = await executor.execute(async (client, signal) => {
      const result = await client.get(scenarioCase.input.fetchPath, { signal });
      if (!result.ok) {
        throw RuntimeError.create(`HTTP ${result.status}`);
      }
      return result;
    });

    assert.equal(response.status, scenarioCase.expected.responseStatus);
    assert.deepStrictEqual(executor.hookCalls.map((call) => call.hook), scenarioCase.expected.hookNames);
    assert.strictEqual(executor.hookCalls[0]?.args.length, 0);
    assert.strictEqual(executor.hookCalls[1]?.args[0], response);
    assert.equal(executor.hookErrorCount, 0);
  },

  'hooks-bracket-error': async (scenarioCase) => {
    const executor = TrackingRequestExecutor.track(resolvePlainExecutorConfig(scenarioCase.input.requestExecutor));

    const error = await captureRejectedError(
      executor.execute(async () => {
        throw RuntimeError.create(scenarioCase.input.errorMessage);
      })
    );
    assertErrorMessageIncludes(error, scenarioCase.input.errorMessage);
    assert.strictEqual(executor.hookCalls[1]?.args[0], error);

    assert.deepStrictEqual(executor.hookCalls.map((call) => call.hook), scenarioCase.expected.hookNames);
    assert.equal(executor.hookErrorCount, 0);
  },

  'hooks-error-not-swallowed': async (scenarioCase) => {
    const executor = ThrowingErrorHookRequestExecutor.thrown(
      resolvePlainExecutorConfig(scenarioCase.input.requestExecutor),
      scenarioCase.input.hookFailureMessage
    );

    const error = await captureRejectedError(
      executor.execute(async () => {
        throw RuntimeError.create(scenarioCase.input.errorMessage);
      })
    );
    // A throwing onExecuteError override must not replace the request failure it
    // observes — the original error, not the hook's HookInvocationError, propagates.
    assertErrorMessageIncludes(error, scenarioCase.input.errorMessage);

    assert.equal(executor.hookErrorCount, scenarioCase.expected.hookErrorCount);
    assert.equal(executor.getHookErrors()[0]?.hookName, scenarioCase.expected.hookErrorName);
  },

  'hooks-noop-default': async (scenarioCase) => {
    setFetch(async (): Promise<Response> => {
      return new Response(scenarioCase.input.fetchResponseText);
    });

    const executor = RequestExecutor.create({ 'fetchClient': FetchClient.create() });
    const response = await executor.execute((client, signal) => client.get(scenarioCase.input.fetchUrl, { signal }));

    assert.equal(response.status, scenarioCase.expected.responseStatus);
    assert.equal(await response.text(), scenarioCase.expected.responseText);
    assert.equal(executor.hookErrorCount, scenarioCase.expected.hookErrorCount);
    assert.deepStrictEqual(executor.getHookErrors(), []);
  },

  'hooks-fire-through-executor': async (scenarioCase) => {
    let failuresRemaining = scenarioCase.input.fetchFailures;
    setFetch(async (input): Promise<Response> => {
      const url = new URL(String(input));
      if (url.pathname === scenarioCase.input.fetchPath) {
        if (failuresRemaining > 0) {
          failuresRemaining -= 1;
          return new Response('fail', { status: 500 });
        }

        return new Response('ok');
      }

      return new Response('not found', { status: 404 });
    });

    const fetchClient = TrackingFetchClient.create(scenarioCase.input.requestExecutor.fetchClient ?? {});
    const retry = new TrackingRetry(scenarioCase.input.requestExecutor.retry);
    const executor = RequestExecutor.create({ fetchClient, retry });

    const response = await executor.execute(async (client, signal) => {
      const result = await client.get(scenarioCase.input.fetchPath, { signal });
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
};

async function runCase<K extends ScenarioCase['shape']>(scenarioCase: Extract<ScenarioCase, { shape: K }>): Promise<void> {
  await runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('RequestExecutor', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
