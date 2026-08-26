import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { AbortError, FetchClient, TimeoutError } from '../../../src/index.js';
import { startTestServer, stopTestServer } from '../../helpers/test-server/index.js';
import scenarioGroups from './features.scenarios.json' with { type: 'json' };

type StatusScenarioCase<Shape extends string> = {
  description: string;
  expected: { status: number };
  input: { fetchClient: Record<string, unknown>; request: { options?: Record<string, unknown>; url: string } };
  shape: Shape;
  name: string;
};

type AbortScenarioCase<Shape extends string> = {
  description: string;
  expected: { abortErrorName: 'AbortError'; urlIncludes: string };
  input: { fetchClient: Record<string, unknown> };
  shape: Shape;
  name: string;
};

type ScenarioCase =
  | StatusScenarioCase<'baseURL-prepend-relative'>
  | StatusScenarioCase<'baseURL-keep-absolute'>
  | StatusScenarioCase<'baseURL-trailing-slash'>
  | StatusScenarioCase<'baseURL-path-without-leading-slash'>
  | StatusScenarioCase<'headers-apply-defaults'>
  | StatusScenarioCase<'headers-merge-default-and-request'>
  | StatusScenarioCase<'headers-override-defaults'>
  | {
      description: string;
      expected: { itemsLengthAtMost: number };
      input: { fetchClient: Record<string, unknown>; request: { url: string } };
      shape: 'params-apply-defaults-with-baseURL';
      name: string;
    }
  | {
      description: string;
      expected: { query: Record<string, string> };
      input: { fetchClient: Record<string, unknown>; request: { url: string } };
      shape: 'params-apply-defaults-without-baseURL';
      name: string;
    }
  | AbortScenarioCase<'abort-details'>
  | AbortScenarioCase<'abort-in-get'>
  | AbortScenarioCase<'abort-first'>
  | {
      description: string;
      expected: { timeoutErrorName: 'TimeoutError' };
      input: { fetchClient: Record<string, unknown> };
      shape: 'timeout-first';
      name: string;
    };

type ScenarioRunner<Shape extends ScenarioCase['shape']> = (scenarioCase: Extract<ScenarioCase, { shape: Shape }>) => Promise<void>;
type RunnerMap = { [Shape in ScenarioCase['shape']]: ScenarioRunner<Shape> };
type StatusScenario = Extract<ScenarioCase, {
  shape:
    | 'baseURL-prepend-relative'
    | 'baseURL-keep-absolute'
    | 'baseURL-trailing-slash'
    | 'baseURL-path-without-leading-slash'
    | 'headers-apply-defaults'
    | 'headers-merge-default-and-request'
    | 'headers-override-defaults';
}>;
type ParamsWithBaseURLScenario = Extract<ScenarioCase, { shape: 'params-apply-defaults-with-baseURL' }>;
type ParamsWithoutBaseURLScenario = Extract<ScenarioCase, { shape: 'params-apply-defaults-without-baseURL' }>;
type AbortDetailsScenario = Extract<ScenarioCase, { shape: 'abort-details' }>;
type TimeoutFirstScenario = Extract<ScenarioCase, { shape: 'timeout-first' }>;
type AbortFirstScenario = Extract<ScenarioCase, { shape: 'abort-first' }>;
type AbortInGetScenario = Extract<ScenarioCase, { shape: 'abort-in-get' }>;

const testClient = FetchClient.create();
let testUrl: string;

void before(async () => {
  testUrl = await startTestServer();
});

void after(async () => {
  await stopTestServer();
});

function materializeConfig(config: Record<string, unknown>): Record<string, unknown> {
  const resolveValue = (value: boolean | null | number | object | string): unknown => {
    if (typeof value === 'string') {
      return value.split('__TEST_URL__').join(testUrl);
    }
    if (Array.isArray(value)) {
      return value.map(resolveValue);
    }
    if (value !== null && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([key, nested]) => {
        const resolved = nested === null
          || typeof nested === 'boolean'
          || typeof nested === 'number'
          || typeof nested === 'object'
          || typeof nested === 'string'
          ? resolveValue(nested)
          : nested;
        return [key, resolved];
      }));
    }
    return value;
  };

  return resolveValue(config) as Record<string, unknown>;
}

function materializeRequest(input: { request: { options?: Record<string, unknown>; url: string } }): { options?: Record<string, unknown>; url: string } {
  const request = materializeConfig(input.request) as { options?: Record<string, unknown>; url: string };
  return request;
}

async function runStatusScenario(scenarioCase: StatusScenario): Promise<void> {
  const config = materializeConfig(scenarioCase.input.fetchClient);
  const client = FetchClient.create(config);
  const request = materializeRequest(scenarioCase.input);
  const response = await client.get(request.url, request.options);
  assert.strictEqual(response.status, scenarioCase.expected.status);
}

async function runParamsWithBaseURLScenario(scenarioCase: ParamsWithBaseURLScenario): Promise<void> {
  const config = materializeConfig(scenarioCase.input.fetchClient);
  const client = FetchClient.create(config);
  const request = materializeRequest(scenarioCase.input);
  const response = await client.get(request.url);
  assert.strictEqual(response.status, 200);
  const data = await response.json();
  assert.ok(Array.isArray(data));
  assert.ok(data.length <= scenarioCase.expected.itemsLengthAtMost);
}

async function runParamsWithoutBaseURLScenario(scenarioCase: ParamsWithoutBaseURLScenario): Promise<void> {
  const config = materializeConfig(scenarioCase.input.fetchClient);
  const client = FetchClient.create(config);
  const request = materializeRequest(scenarioCase.input);
  const response = await client.get(request.url);
  assert.strictEqual(response.status, 200);
  const data = await response.json() as { query: Record<string, string> };
  assert.deepStrictEqual(data.query, scenarioCase.expected.query);
}

async function runAbortDetailsScenario(scenarioCase: AbortDetailsScenario): Promise<void> {
  const controller = new AbortController();
  setTimeout(() => { controller.abort(); }, 10);
  try {
    await testClient.get(`${testUrl}/delay`, { signal: controller.signal });
    assert.fail('Should have thrown AbortError');
  } catch (error) {
    assert.ok(error instanceof AbortError);
    if (error instanceof AbortError) {
      assert.ok(error.url.includes(scenarioCase.expected.urlIncludes));
    }
  }
}

async function runTimeoutFirstScenario(scenarioCase: TimeoutFirstScenario): Promise<void> {
  const controller = new AbortController();
  await assert.rejects(async () => {
    await testClient.get(`${testUrl}/delay`, {
      signal: controller.signal,
      timeout: 100
    });
  }, (error) => error instanceof TimeoutError && error.name === scenarioCase.expected.timeoutErrorName);
}

async function runAbortFirstScenario(scenarioCase: AbortFirstScenario): Promise<void> {
  const controller = new AbortController();
  setTimeout(() => { controller.abort(); }, 50);
  await assert.rejects(async () => {
    await testClient.get(`${testUrl}/delay`, {
      signal: controller.signal,
      timeout: 5000
    });
  }, (error) => error instanceof AbortError && error.name === scenarioCase.expected.abortErrorName);
}

async function runAbortInGetScenario(scenarioCase: AbortInGetScenario): Promise<void> {
  const controller = new AbortController();
  setTimeout(() => { controller.abort(); }, 50);
  await assert.rejects(async () => {
    await testClient.get(`${testUrl}/delay`, { signal: controller.signal });
  }, (error) => error instanceof AbortError && error.name === scenarioCase.expected.abortErrorName);
}

const runnerMap: RunnerMap = {
  'abort-details': runAbortDetailsScenario,
  'abort-first': runAbortFirstScenario,
  'abort-in-get': runAbortInGetScenario,
  'baseURL-keep-absolute': runStatusScenario,
  'baseURL-path-without-leading-slash': runStatusScenario,
  'baseURL-prepend-relative': runStatusScenario,
  'baseURL-trailing-slash': runStatusScenario,
  'headers-apply-defaults': runStatusScenario,
  'headers-merge-default-and-request': runStatusScenario,
  'headers-override-defaults': runStatusScenario,
  'params-apply-defaults-with-baseURL': runParamsWithBaseURLScenario,
  'params-apply-defaults-without-baseURL': runParamsWithoutBaseURLScenario,
  'timeout-first': runTimeoutFirstScenario
};

async function runCase<Shape extends ScenarioCase['shape']>(scenarioCase: Extract<ScenarioCase, { shape: Shape }>): Promise<void> {
  await runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('fetch integration features', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
