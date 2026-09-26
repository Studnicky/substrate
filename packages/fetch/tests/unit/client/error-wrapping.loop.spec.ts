import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  BodyTimeoutError,
  ConnectTimeoutError,
  FetchClient,
  HeadersTimeoutError,
  SocketError,
  SocketExhaustionError
} from '../../../src/node/index.js';

import { ErrorWrappingScenarioCaseEntity } from './entities/ErrorWrappingScenarioCaseEntity.js';
import scenarioGroups from './error-wrapping.scenarios.json' with { type: 'json' };

type ScenarioCase = ErrorWrappingScenarioCaseEntity.Type;
type RunnerMap = { [Shape in ScenarioCase['shape']]: (scenarioCase: ScenarioCase) => Promise<void> };

const fileIntake = ScenarioFileCompiler.compileIntake(ErrorWrappingScenarioCaseEntity.Schema, ErrorWrappingScenarioCaseEntity.Node);

function createCodedError(message: string, code?: string): NodeJS.ErrnoException {
  const error: NodeJS.ErrnoException = new Error(message);
  if (code !== undefined) {
    error.code = code;
  }
  return error;
}

function createClient(config: ScenarioCase['input']['fetchClient']): FetchClient {
  return FetchClient.create(config);
}

/** Categorizes a wrapped result the same way `expected.shape` describes it in the scenario data. */
function resultShape(wrapped: Error | undefined): 'error' | 'socket-exhaustion' | 'undefined' {
  if (wrapped === undefined) {
    return 'undefined';
  }
  if (wrapped instanceof SocketExhaustionError) {
    return 'socket-exhaustion';
  }
  return 'error';
}

function stubDispatcherHealth(client: FetchClient): void {
  const dispatcher = Reflect.get(client, 'dispatcher');
  dispatcher.checkDispatcherHealth = () => ({ 'stats': { 'freeConnections': 0, 'maxConnections': 2, 'pendingRequests': 1, 'queuedRequests': 0 } });
}

async function wrapUndiciError(client: FetchClient, error: Error, url: string): Promise<Error | undefined> {
  return Reflect.apply(Reflect.get(client, 'wrapUndiciError'), client, [error, url, 'GET', 'request-1', 1]);
}

async function handleSocketExhaustion(client: FetchClient, url: string, errorCode: string): Promise<Error | undefined> {
  return Reflect.apply(Reflect.get(client, 'handleSocketExhaustion'), client, [url, errorCode, 'GET', 'request-1', 1]);
}

const mappedErrorConstructorMap: Record<'wrap-body-timeout' | 'wrap-connect-timeout' | 'wrap-headers-timeout' | 'wrap-socket-error', new (...args: never[]) => Error> = {
  'wrap-body-timeout': BodyTimeoutError,
  'wrap-connect-timeout': ConnectTimeoutError,
  'wrap-headers-timeout': HeadersTimeoutError,
  'wrap-socket-error': SocketError
};

async function runMappedErrorScenario(scenarioCase: ScenarioCase, shape: keyof typeof mappedErrorConstructorMap): Promise<void> {
  if (scenarioCase.expected.shape !== 'error') {
    throw new Error(`Expected error-shaped expectation for ${scenarioCase.name}`);
  }

  const client = createClient(scenarioCase.input.fetchClient);
  stubDispatcherHealth(client);
  const error = createCodedError('mapped', scenarioCase.input.errorCode);
  const wrapped = await wrapUndiciError(client, error, scenarioCase.input.url);
  assert.ok(wrapped instanceof mappedErrorConstructorMap[shape]);
  assert.equal(wrapped.name, scenarioCase.expected.errorName);
  assert.equal(resultShape(wrapped), scenarioCase.expected.shape);
}

const runnerMap: RunnerMap = {
  'handle-dispatcher-health': async (scenarioCase) => {
    const client = createClient(scenarioCase.input.fetchClient);
    stubDispatcherHealth(client);
    const wrapped = await handleSocketExhaustion(client, scenarioCase.input.url, scenarioCase.input.errorCode ?? 'UND_ERR_CONNECT_TIMEOUT');
    assert.ok(wrapped instanceof SocketExhaustionError);
    assert.equal(resultShape(wrapped), scenarioCase.expected.shape);
  },
  'handle-invalid-origin': async (scenarioCase) => {
    const client = createClient(scenarioCase.input.fetchClient);
    const wrapped = await handleSocketExhaustion(client, scenarioCase.input.url, scenarioCase.input.errorCode ?? 'UND_ERR_CONNECT_TIMEOUT');
    assert.equal(wrapped, undefined);
    assert.equal(resultShape(wrapped), scenarioCase.expected.shape);
  },
  'handle-no-dispatcher': async (scenarioCase) => {
    const client = createClient(scenarioCase.input.fetchClient);
    const wrapped = await handleSocketExhaustion(client, scenarioCase.input.url, scenarioCase.input.errorCode ?? 'UND_ERR_CONNECT_TIMEOUT');
    assert.equal(wrapped, undefined);
    assert.equal(resultShape(wrapped), scenarioCase.expected.shape);
  },
  'wrap-body-timeout': async (scenarioCase) => { await runMappedErrorScenario(scenarioCase, 'wrap-body-timeout'); },
  'wrap-connect-timeout': async (scenarioCase) => { await runMappedErrorScenario(scenarioCase, 'wrap-connect-timeout'); },
  'wrap-headers-timeout': async (scenarioCase) => { await runMappedErrorScenario(scenarioCase, 'wrap-headers-timeout'); },
  'wrap-no-code': async (scenarioCase) => {
    const client = createClient(scenarioCase.input.fetchClient);
    const wrapped = await wrapUndiciError(client, createCodedError('no code'), scenarioCase.input.url);
    assert.equal(wrapped, undefined);
    assert.equal(resultShape(wrapped), scenarioCase.expected.shape);
  },
  'wrap-socket-error': async (scenarioCase) => { await runMappedErrorScenario(scenarioCase, 'wrap-socket-error'); },
  'wrap-unknown-code': async (scenarioCase) => {
    const client = createClient(scenarioCase.input.fetchClient);
    const wrapped = await wrapUndiciError(client, createCodedError('unknown', scenarioCase.input.errorCode), scenarioCase.input.url);
    assert.equal(wrapped, undefined);
    assert.equal(resultShape(wrapped), scenarioCase.expected.shape);
  }
};

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  await runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('fetch error wrapping', () => {
  for (const scenarioCase of fileIntake(scenarioGroups).cases) {
    void it(scenarioCase.name, async () => {
      await runCase(scenarioCase);
    });
  }
});
