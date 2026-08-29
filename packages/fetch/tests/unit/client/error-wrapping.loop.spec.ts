import { RuntimeError } from '@studnicky/errors';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  BodyTimeoutError,
  ConnectTimeoutError,
  FetchClient,
  HeadersTimeoutError,
  SocketError,
  SocketExhaustionError
} from '../../../src/index.js';

import scenarioGroups from './error-wrapping.scenarios.json' with { type: 'json' };

type ScenarioCase =
  | {
      description: string;
      expected: { shape: 'undefined' };
      input: { errorCode: string; fetchClient: Parameters<typeof FetchClient.create>[0]; url: string };
      shape: 'wrap-unknown-code';
      name: string;
    }
  | {
      description: string;
      expected: { shape: 'undefined' };
      input: { errorCode?: string; fetchClient: Parameters<typeof FetchClient.create>[0]; url: string };
      shape: 'wrap-no-code';
      name: string;
    }
  | {
      description: string;
      expected: { shape: 'undefined' };
      input: { errorCode: string; fetchClient: Parameters<typeof FetchClient.create>[0]; url: string };
      shape: 'handle-no-dispatcher';
      name: string;
    }
  | {
      description: string;
      expected: { shape: 'undefined' };
      input: { errorCode: string; fetchClient: Parameters<typeof FetchClient.create>[0]; url: string };
      shape: 'handle-invalid-origin';
      name: string;
    }
  | {
      description: string;
      expected: { shape: 'error'; errorName: 'BodyTimeoutError' };
      input: { errorCode: string; fetchClient: Parameters<typeof FetchClient.create>[0]; url: string };
      shape: 'wrap-body-timeout';
      name: string;
    }
  | {
      description: string;
      expected: { shape: 'error'; errorName: 'ConnectTimeoutError' };
      input: { errorCode: string; fetchClient: Parameters<typeof FetchClient.create>[0]; url: string };
      shape: 'wrap-connect-timeout';
      name: string;
    }
  | {
      description: string;
      expected: { shape: 'error'; errorName: 'HeadersTimeoutError' };
      input: { errorCode: string; fetchClient: Parameters<typeof FetchClient.create>[0]; url: string };
      shape: 'wrap-headers-timeout';
      name: string;
    }
  | {
      description: string;
      expected: { shape: 'error'; errorName: 'SocketError' };
      input: { errorCode: string; fetchClient: Parameters<typeof FetchClient.create>[0]; url: string };
      shape: 'wrap-socket-error';
      name: string;
    }
  | {
      description: string;
      expected: { shape: 'socket-exhaustion' };
      input: { errorCode: string; fetchClient: Parameters<typeof FetchClient.create>[0]; url: string };
      shape: 'handle-dispatcher-health';
      name: string;
    };

type ScenarioRunner<Shape extends ScenarioCase['shape']> = (scenarioCase: Extract<ScenarioCase, { shape: Shape }>) => Promise<void>;
type RunnerMap = { [Shape in ScenarioCase['shape']]: ScenarioRunner<Shape> };
type MappedErrorScenario = Extract<ScenarioCase, {
  shape:
    | 'wrap-body-timeout'
    | 'wrap-connect-timeout'
    | 'wrap-headers-timeout'
    | 'wrap-socket-error';
}>;
type MappedErrorAssertionMap = { [Shape in MappedErrorScenario['shape']]: (wrapped: Error | undefined, scenarioCase: MappedErrorScenario) => void };

function createClient(config: Parameters<typeof FetchClient.create>[0]): FetchClient {
  return FetchClient.create(config);
}

/**
 * Categorizes a wrapped result the same way `expected.shape` describes it in the scenario data.
 */
function resultShape(wrapped: Error | undefined): 'error' | 'socket-exhaustion' | 'undefined' {
  if (wrapped === undefined) {
    return 'undefined';
  }
  if (wrapped instanceof SocketExhaustionError) {
    return 'socket-exhaustion';
  }
  return 'error';
}

const mappedErrorAssertionMap: MappedErrorAssertionMap = {
  'wrap-body-timeout': (wrapped, scenarioCase) => {
    assert.ok(wrapped instanceof BodyTimeoutError);
    assert.equal(wrapped.name, scenarioCase.expected.errorName);
    assert.equal(resultShape(wrapped), scenarioCase.expected.shape);
  },
  'wrap-connect-timeout': (wrapped, scenarioCase) => {
    assert.ok(wrapped instanceof ConnectTimeoutError);
    assert.equal(wrapped.name, scenarioCase.expected.errorName);
    assert.equal(resultShape(wrapped), scenarioCase.expected.shape);
  },
  'wrap-headers-timeout': (wrapped, scenarioCase) => {
    assert.ok(wrapped instanceof HeadersTimeoutError);
    assert.equal(wrapped.name, scenarioCase.expected.errorName);
    assert.equal(resultShape(wrapped), scenarioCase.expected.shape);
  },
  'wrap-socket-error': (wrapped, scenarioCase) => {
    assert.ok(wrapped instanceof SocketError);
    assert.equal(wrapped.name, scenarioCase.expected.errorName);
    assert.equal(resultShape(wrapped), scenarioCase.expected.shape);
  }
};

async function runMappedErrorScenario(scenarioCase: MappedErrorScenario): Promise<void> {
  const error = RuntimeError.create('mapped') as Error & { code?: string };
  error.code = scenarioCase.input.errorCode;
  const client = createClient(scenarioCase.input.fetchClient) as never;
  const dispatcher = Reflect.get(client, 'dispatcher') as { checkDispatcherHealth(origin: string): { stats: Record<string, unknown> } };
  dispatcher.checkDispatcherHealth = () => ({ 'stats': { 'freeConnections': 0, 'maxConnections': 2, 'pendingRequests': 1, 'queuedRequests': 0 } });
  const wrapped = await (client as { wrapUndiciError(error: Error, url: string, method: string, requestId: string, duration: number): Promise<Error | undefined> }).wrapUndiciError(error, scenarioCase.input.url, 'GET', 'request-1', 1);
  mappedErrorAssertionMap[scenarioCase.shape](wrapped, scenarioCase);
}

const runnerMap: RunnerMap = {
  'handle-dispatcher-health': async (scenarioCase) => {
    const client = createClient(scenarioCase.input.fetchClient) as never;
    const dispatcher = Reflect.get(client, 'dispatcher') as { checkDispatcherHealth(origin: string): { stats: Record<string, unknown> } };
    dispatcher.checkDispatcherHealth = () => ({ 'stats': { 'freeConnections': 0, 'maxConnections': 2, 'pendingRequests': 1, 'queuedRequests': 0 } });
    const wrapped = await (client as { handleSocketExhaustion(url: string, errorCode: string, method: string, requestId: string, duration: number): Promise<Error | undefined> }).handleSocketExhaustion(scenarioCase.input.url, scenarioCase.input.errorCode, 'GET', 'request-1', 1);
    assert.ok(wrapped instanceof SocketExhaustionError);
    assert.equal(resultShape(wrapped), scenarioCase.expected.shape);
  },
  'handle-invalid-origin': async (scenarioCase) => {
    const client = createClient(scenarioCase.input.fetchClient) as never;
    const wrapped = await (client as { handleSocketExhaustion(url: string, errorCode: string, method: string, requestId: string, duration: number): Promise<Error | undefined> }).handleSocketExhaustion(scenarioCase.input.url, scenarioCase.input.errorCode, 'GET', 'request-1', 1);
    assert.equal(wrapped, undefined);
    assert.equal(resultShape(wrapped), scenarioCase.expected.shape);
  },
  'handle-no-dispatcher': async (scenarioCase) => {
    const error = RuntimeError.create('connect timeout') as Error & { code?: string };
    error.code = scenarioCase.input.errorCode ?? 'UND_ERR_CONNECT_TIMEOUT';
    const client = createClient(scenarioCase.input.fetchClient) as never;
    const wrapped = await (client as { handleSocketExhaustion(url: string, errorCode: string, method: string, requestId: string, duration: number): Promise<Error | undefined> }).handleSocketExhaustion(scenarioCase.input.url, error.code, 'GET', 'request-1', 1);
    assert.equal(wrapped, undefined);
    assert.equal(resultShape(wrapped), scenarioCase.expected.shape);
  },
  'wrap-body-timeout': runMappedErrorScenario,
  'wrap-connect-timeout': runMappedErrorScenario,
  'wrap-headers-timeout': runMappedErrorScenario,
  'wrap-no-code': async (scenarioCase) => {
    const client = createClient(scenarioCase.input.fetchClient) as never;
    const wrapped = await (client as { wrapUndiciError(error: Error, url: string, method: string, requestId: string, duration: number): Promise<Error | undefined> }).wrapUndiciError(RuntimeError.create('no code'), scenarioCase.input.url, 'GET', 'request-1', 1);
    assert.equal(wrapped, undefined);
    assert.equal(resultShape(wrapped), scenarioCase.expected.shape);
  },
  'wrap-socket-error': runMappedErrorScenario,
  'wrap-unknown-code': async (scenarioCase) => {
    const error = RuntimeError.create('unknown') as Error & { code?: string };
    error.code = scenarioCase.input.errorCode;
    const client = createClient(scenarioCase.input.fetchClient) as never;
    const wrapped = await (client as { wrapUndiciError(error: Error, url: string, method: string, requestId: string, duration: number): Promise<Error | undefined> }).wrapUndiciError(error, scenarioCase.input.url, 'GET', 'request-1', 1);
    assert.equal(wrapped, undefined);
    assert.equal(resultShape(wrapped), scenarioCase.expected.shape);
  }
};

async function runCase<Shape extends ScenarioCase['shape']>(scenarioCase: Extract<ScenarioCase, { shape: Shape }>): Promise<void> {
  await runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('fetch error wrapping', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
