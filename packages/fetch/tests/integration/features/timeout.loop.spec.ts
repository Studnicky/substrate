import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { FetchClient, TimeoutError } from '../../../src/node/index.js';
import { startTestServer, stopTestServer } from '../../helpers/test-server/index.js';
import scenarioGroups from './timeout.scenarios.json' with { type: 'json' };

type ScenarioCase =
  | {
      description: string;
      expected: { status: number };
      input: { request: { timeout?: number; url: string } };
      shape: 'completes-without-timeout';
      name: string;
    }
  | {
      description: string;
      expected: { errorName: 'TimeoutError' };
      input: { request: { timeout: number; url: string } };
      shape: 'times-out-fast-request';
      name: string;
    }
  | {
      description: string;
      expected: { errorName: 'TimeoutError'; timeoutMs: number; urlIncludes: string };
      input: { request: { timeout: number; url: string } };
      shape: 'reports-timeout-details';
      name: string;
    }
  | {
      description: string;
      expected: { status: number };
      input: { request: { timeout: number; url: string } };
      shape: 'clears-timeout-after-success';
      name: string;
    }
  | {
      description: string;
      expected: { errorName: 'TimeoutError' };
      input: { request: { timeout: number; url: string } };
      shape: 'supports-timeout-in-get';
      name: string;
    }
  | {
      description: string;
      expected: { status: number };
      input: { request: { timeout: number; url: string } };
      shape: 'works-with-fast-requests';
      name: string;
    }
  | {
      description: string;
      expected: { status: number };
      input: { clientTimeout: number; request: { url: string } };
      shape: 'applies-default-timeout';
      name: string;
    }
  | {
      description: string;
      expected: { status: number };
      input: { clientTimeout: number; request: { timeout: number; url: string } };
      shape: 'request-overrides-default-timeout';
      name: string;
    };

type ScenarioRunner<Shape extends ScenarioCase['shape']> = (scenarioCase: Extract<ScenarioCase, { shape: Shape }>) => Promise<void>;
type RunnerMap = { [Shape in ScenarioCase['shape']]: ScenarioRunner<Shape> };
type CompletesWithoutTimeoutScenario = Extract<ScenarioCase, { shape: 'completes-without-timeout' }>;
type TimesOutFastRequestScenario = Extract<ScenarioCase, { shape: 'times-out-fast-request' }>;
type ReportsTimeoutDetailsScenario = Extract<ScenarioCase, { shape: 'reports-timeout-details' }>;
type ClearsTimeoutAfterSuccessScenario = Extract<ScenarioCase, { shape: 'clears-timeout-after-success' }>;
type SupportsTimeoutInGetScenario = Extract<ScenarioCase, { shape: 'supports-timeout-in-get' }>;
type WorksWithFastRequestsScenario = Extract<ScenarioCase, { shape: 'works-with-fast-requests' }>;
type AppliesDefaultTimeoutScenario = Extract<ScenarioCase, { shape: 'applies-default-timeout' }>;
type RequestOverridesDefaultTimeoutScenario = Extract<ScenarioCase, { shape: 'request-overrides-default-timeout' }>;

const client = FetchClient.create();

let testUrl: string;

void before(async () => {
  testUrl = await startTestServer();
});

void after(async () => {
  await stopTestServer();
});

function resolveUrl(url: string): string {
  return url.replace('__TEST_URL__', testUrl);
}

async function runCompletesWithoutTimeoutScenario(scenarioCase: CompletesWithoutTimeoutScenario): Promise<void> {
  const response = await client.get(`${testUrl}${scenarioCase.input.request.url}`);
  assert.strictEqual(response.status, scenarioCase.expected.status);
}

async function runTimesOutFastRequestScenario(scenarioCase: TimesOutFastRequestScenario): Promise<void> {
  const requestUrl = resolveUrl(scenarioCase.input.request.url);
  await assert.rejects(async () => {
    await client.get(requestUrl, {
      timeout: scenarioCase.input.request.timeout
    });
  }, (error) => error instanceof TimeoutError && error.name === scenarioCase.expected.errorName);
}

async function runReportsTimeoutDetailsScenario(scenarioCase: ReportsTimeoutDetailsScenario): Promise<void> {
  await assert.rejects(async () => {
    await client.get(`${testUrl}${scenarioCase.input.request.url}`, { timeout: scenarioCase.input.request.timeout });
  }, (error) => {
    assert.ok(error instanceof TimeoutError);
    assert.strictEqual(error.timeoutMs, scenarioCase.expected.timeoutMs);
    assert.ok(error.url.includes(scenarioCase.expected.urlIncludes));
    return true;
  });
}

async function runClearsTimeoutAfterSuccessScenario(scenarioCase: ClearsTimeoutAfterSuccessScenario): Promise<void> {
  const response = await client.get(`${testUrl}${scenarioCase.input.request.url}`, { timeout: scenarioCase.input.request.timeout });
  assert.strictEqual(response.status, scenarioCase.expected.status);
}

async function runSupportsTimeoutInGetScenario(scenarioCase: SupportsTimeoutInGetScenario): Promise<void> {
  await assert.rejects(async () => {
    await client.get(`${testUrl}${scenarioCase.input.request.url}`, { timeout: scenarioCase.input.request.timeout });
  }, (error) => error instanceof TimeoutError && error.name === scenarioCase.expected.errorName);
}

async function runWorksWithFastRequestsScenario(scenarioCase: WorksWithFastRequestsScenario): Promise<void> {
  const response = await client.get(`${testUrl}${scenarioCase.input.request.url}`, { timeout: scenarioCase.input.request.timeout });
  assert.strictEqual(response.status, scenarioCase.expected.status);
}

async function runAppliesDefaultTimeoutScenario(scenarioCase: AppliesDefaultTimeoutScenario): Promise<void> {
  const clientWithDefault = FetchClient.create({ timeout: scenarioCase.input.clientTimeout });
  const response = await clientWithDefault.get(`${testUrl}${scenarioCase.input.request.url}`);
  assert.strictEqual(response.status, scenarioCase.expected.status);
}

async function runRequestOverridesDefaultTimeoutScenario(scenarioCase: RequestOverridesDefaultTimeoutScenario): Promise<void> {
  const clientWithDefault = FetchClient.create({ timeout: scenarioCase.input.clientTimeout });
  const response = await clientWithDefault.get(`${testUrl}${scenarioCase.input.request.url}`, { timeout: scenarioCase.input.request.timeout });
  assert.strictEqual(response.status, scenarioCase.expected.status);
}

const runnerMap: RunnerMap = {
  'applies-default-timeout': runAppliesDefaultTimeoutScenario,
  'clears-timeout-after-success': runClearsTimeoutAfterSuccessScenario,
  'completes-without-timeout': runCompletesWithoutTimeoutScenario,
  'reports-timeout-details': runReportsTimeoutDetailsScenario,
  'request-overrides-default-timeout': runRequestOverridesDefaultTimeoutScenario,
  'supports-timeout-in-get': runSupportsTimeoutInGetScenario,
  'times-out-fast-request': runTimesOutFastRequestScenario,
  'works-with-fast-requests': runWorksWithFastRequestsScenario
};

async function runCase<Shape extends ScenarioCase['shape']>(scenarioCase: Extract<ScenarioCase, { shape: Shape }>): Promise<void> {
  await runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('Timeout Feature', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
