import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { Context } from '@studnicky/context';
import { AbortError, FetchClient, type ClientConfigInterface, type RequestContextInterface, type ResponseContextInterface } from '@studnicky/fetch';
import type { ErrorClassificationEntity } from '@studnicky/errors';
import { Retry, type RetryContextInterface, type RetryConfigInterface } from '@studnicky/retry';
import { Timing } from '@studnicky/timing';

import { RequestDeadlineEntity, RequestExecutor } from '../../../src/index.js';
import type { RequestExecutorConfigInterface } from '../../../src/interfaces/RequestExecutorConfigInterface.js';
import scenarioGroups from './request-executor.scenarios.json';

interface ScenarioRequestExecutorInputInterface {
  context?: { name: string };
  deadlineMs?: number;
  fetchClient?: ClientConfigInterface;
  retry?: RetryConfigInterface;
}

type ScenarioCase =
  | {
      description: string;
      expected: { accepted: true };
      input: { values: Array<Record<string, unknown>> };
      kind: 'entity-validates-deadlines';
      name: string;
    }
  | {
      description: string;
      expected: { accepted: false };
      input: { values: Array<Record<string, unknown>> };
      kind: 'entity-rejects-negative-deadline';
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
      kind: 'create-plain-config';
      name: string;
    }
  | {
      description: string;
      expected: { result: string; retryTotalRetries: number; sameFetchClient: true };
      input: {
        requestExecutor: ScenarioRequestExecutorInputInterface;
        retryFailOnceMessage: string;
      };
      kind: 'create-with-instances';
      name: string;
    }
  | {
      description: string;
      expected: { responseStatus: number; responseText: string };
      input: { fetchResponseText: string; fetchUrl: string };
      kind: 'defaults-real-primitives';
      name: string;
    }
  | {
      description: string;
      expected: { observedRequestId: string };
      input: { contextValue: string; fetchResponseText: string; requestExecutor: ScenarioRequestExecutorInputInterface };
      kind: 'context-roundtrip';
      name: string;
    }
  | {
      description: string;
      expected: { observedSeed: number };
      input: { contextSeed: number; fetchResponseText: string; requestExecutor: ScenarioRequestExecutorInputInterface };
      kind: 'context-seeded-values';
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
      kind: 'cancellation-merged-signal';
      name: string;
    }
  | {
      description: string;
      expected: { responseStatus: number; signalAborted: false };
      input: { fetchDelayMs: number; fetchPath: string; requestExecutor: ScenarioRequestExecutorInputInterface; responseText: string };
      kind: 'cancellation-default-signal';
      name: string;
    }
  | {
      description: string;
      expected: { responseStatus: number; signalAborted: false };
      input: { fetchDelayMs: number; fetchPath: string; requestExecutor: ScenarioRequestExecutorInputInterface; responseText: string };
      kind: 'cancellation-deadline-only';
      name: string;
    }
  | {
      description: string;
      expected: { completeEvents: number; responseStatus: number; startEvents: number };
      input: { fetchFailures: number; fetchPath: string; requestExecutor: ScenarioRequestExecutorInputInterface };
      kind: 'timing-brackets-retry-loop';
      name: string;
    }
  | {
      description: string;
      expected: { errorEvents: number; errorMessage: string; startEvents: number };
      input: { errorMessage: string; requestExecutor: ScenarioRequestExecutorInputInterface };
      kind: 'timing-brackets-error';
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
      kind: 'hooks-fire-through-executor';
      name: string;
    };

const originalFetch = globalThis.fetch;

void afterEach(() => {
  globalThis.fetch = originalFetch;
});

function setFetch(handler: typeof fetch): void {
  globalThis.fetch = handler;
}

class TrackingTiming extends Timing {
  readonly eventNames: string[] = [];

  protected override onEvent(data: { component: string; event: string; operation: string }): void {
    this.eventNames.push(data.event);
  }
}

class TrackingFetchClient extends FetchClient {
  readonly requestPaths: string[] = [];
  readonly responseStatuses: number[] = [];

  static override create(config = {}): TrackingFetchClient {
    return new this(config);
  }

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
    ...(input?.context !== undefined ? { context: Context.create(input.context) } : {}),
    ...(input?.deadlineMs !== undefined ? { deadlineMs: input.deadlineMs } : {}),
    ...(input?.fetchClient !== undefined ? { fetchClient: input.fetchClient } : {}),
    ...(input?.retry !== undefined ? { retry: input.retry } : {})
  };
}

function createFetchClientFromScenario(input: ScenarioRequestExecutorInputInterface): FetchClient {
  return FetchClient.create(input.fetchClient ?? {});
}

function createRetryFromScenario(input: ScenarioRequestExecutorInputInterface): Retry {
  return Retry.create(input.retry);
}

function requireContextFromScenario(input: ScenarioRequestExecutorInputInterface): Context {
  if (input.context === undefined) {
    throw new Error('Scenario input.requestExecutor.context is required');
  }
  return Context.create(input.context);
}

const runnerMap: Record<ScenarioCase['kind'], (scenarioCase: ScenarioCase) => Promise<void>> = {
  'entity-validates-deadlines': async (scenarioCase) => {
    for (const value of scenarioCase.input.values) {
      assert.equal(RequestDeadlineEntity.validate(value), true);
    }
    assert.equal(scenarioCase.expected.accepted, true);
  },

  'entity-rejects-negative-deadline': async (scenarioCase) => {
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
        throw new Error(scenarioCase.input.retryFailOnceMessage);
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

    const executor = RequestExecutor.create();
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
      context,
      fetchClient: createFetchClientFromScenario(scenarioCase.input.requestExecutor),
      retry: createRetryFromScenario(scenarioCase.input.requestExecutor)
    });
    let observedRequestId: string | undefined;

    await executor.execute(async (client, signal) => {
      context.set('requestId', scenarioCase.input.contextValue);
      const requestId = context.get('requestId');
      if (typeof requestId !== 'string') {
        throw new TypeError('Expected requestId context value to be a string');
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
      context,
      fetchClient: createFetchClientFromScenario(scenarioCase.input.requestExecutor),
      retry: createRetryFromScenario(scenarioCase.input.requestExecutor)
    });
    let observedSeed: number | undefined;

    await executor.execute(
      async (client, signal) => {
        const seed = context.get('seed');
        if (typeof seed !== 'number') {
          throw new TypeError('Expected seed context value to be a number');
        }
        observedSeed = seed;
        return client.get('/', { signal });
      },
      { contextInitial: { seed: scenarioCase.input.contextSeed } }
    );

    assert.equal(observedSeed, scenarioCase.expected.observedSeed);
  },

  'cancellation-merged-signal': async (scenarioCase) => {
    setFetch((_: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      return new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        if (signal === undefined) {
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

    await assert.rejects(
      executor.execute(
        (client, signal) => client.get(scenarioCase.input.fetchPath, { signal }),
        { signal: controller.signal }
      ),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        let current: unknown = error;
        let foundAbort = false;
        while (current instanceof Error) {
          if (current instanceof AbortError || current.name === 'AbortError') {
            foundAbort = true;
            break;
          }
          current = current.cause;
        }
        assert.equal(foundAbort, scenarioCase.expected.aborted);
        return true;
      }
    );
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

  'timing-brackets-retry-loop': async (scenarioCase) => {
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

    const timing = new TrackingTiming();
    const executor = RequestExecutor.create({
      ...resolvePlainExecutorConfig(scenarioCase.input.requestExecutor),
      timing
    });

    const response = await executor.execute(async (client, signal) => {
      const result = await client.get(scenarioCase.input.fetchPath, { signal });
      if (!result.ok) {
        throw new Error(`HTTP ${result.status}`);
      }
      return result;
    });

    assert.equal(response.status, scenarioCase.expected.responseStatus);
    assert.equal(timing.eventNames.filter((name) => name === 'RequestExecutor.execute.start').length, scenarioCase.expected.startEvents);
    assert.equal(timing.eventNames.filter((name) => name === 'RequestExecutor.execute.complete').length, scenarioCase.expected.completeEvents);
    const events = timing.getEvents();
    assert.ok(events['RequestExecutor.execute.start'] !== undefined);
    assert.ok(events['RequestExecutor.execute.complete'] !== undefined);
  },

  'timing-brackets-error': async (scenarioCase) => {
    const timing = new TrackingTiming();
    const executor = RequestExecutor.create({
      ...resolvePlainExecutorConfig(scenarioCase.input.requestExecutor),
      timing
    });

    await assert.rejects(
      () => executor.execute(async () => {
        throw new Error(scenarioCase.input.errorMessage);
      }),
      new RegExp(scenarioCase.input.errorMessage)
    );

    assert.equal(timing.eventNames.filter((name) => name === 'RequestExecutor.execute.start').length, scenarioCase.expected.startEvents);
    assert.equal(timing.eventNames.filter((name) => name === 'RequestExecutor.execute.error').length, scenarioCase.expected.errorEvents);
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

    const fetchClient = new TrackingFetchClient(scenarioCase.input.requestExecutor.fetchClient ?? {});
    const retry = new TrackingRetry(scenarioCase.input.requestExecutor.retry);
    const executor = RequestExecutor.create({ fetchClient, retry });

    const response = await executor.execute(async (client, signal) => {
      const result = await client.get(scenarioCase.input.fetchPath, { signal });
      if (!result.ok) {
        throw new Error(`HTTP ${result.status}`);
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

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  await runnerMap[scenarioCase.kind](scenarioCase);
}

void describe('RequestExecutor', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
