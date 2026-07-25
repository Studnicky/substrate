import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { FetchClient, TimeoutError } from '../../../src/index.js';
import { startTestServer, stopTestServer } from '../../helpers/test-server/index.js';
import scenarioGroups from './timeout.scenarios.json';

type ScenarioCase =
  | {
      description: string;
      expected: { status: number };
      input: { request: { timeout?: number; url: string } };
      kind: 'completes-without-timeout';
      name: string;
    }
  | {
      description: string;
      expected: { errorName: 'TimeoutError' };
      input: { request: { timeout: number; url: string } };
      kind: 'times-out-fast-request';
      name: string;
    }
  | {
      description: string;
      expected: { errorName: 'TimeoutError'; timeoutMs: number; urlIncludes: string };
      input: { request: { timeout: number; url: string } };
      kind: 'reports-timeout-details';
      name: string;
    }
  | {
      description: string;
      expected: { status: number };
      input: { request: { timeout: number; url: string } };
      kind: 'clears-timeout-after-success';
      name: string;
    }
  | {
      description: string;
      expected: { errorName: 'TimeoutError' };
      input: { request: { timeout: number; url: string } };
      kind: 'supports-timeout-in-get';
      name: string;
    }
  | {
      description: string;
      expected: { status: number };
      input: { request: { timeout: number; url: string } };
      kind: 'works-with-fast-requests';
      name: string;
    }
  | {
      description: string;
      expected: { status: number };
      input: { clientTimeout: number; request: { url: string } };
      kind: 'applies-default-timeout';
      name: string;
    }
  | {
      description: string;
      expected: { status: number };
      input: { clientTimeout: number; request: { timeout: number; url: string } };
      kind: 'request-overrides-default-timeout';
      name: string;
    };

type ScenarioRunner<Kind extends ScenarioCase['kind']> = (scenarioCase: Extract<ScenarioCase, { kind: Kind }>) => Promise<void>;
type RunnerMap = { [Kind in ScenarioCase['kind']]: ScenarioRunner<Kind> };
type CompletesWithoutTimeoutScenario = Extract<ScenarioCase, { kind: 'completes-without-timeout' }>;
type TimesOutFastRequestScenario = Extract<ScenarioCase, { kind: 'times-out-fast-request' }>;
type ReportsTimeoutDetailsScenario = Extract<ScenarioCase, { kind: 'reports-timeout-details' }>;
type ClearsTimeoutAfterSuccessScenario = Extract<ScenarioCase, { kind: 'clears-timeout-after-success' }>;
type SupportsTimeoutInGetScenario = Extract<ScenarioCase, { kind: 'supports-timeout-in-get' }>;
type WorksWithFastRequestsScenario = Extract<ScenarioCase, { kind: 'works-with-fast-requests' }>;
type AppliesDefaultTimeoutScenario = Extract<ScenarioCase, { kind: 'applies-default-timeout' }>;
type RequestOverridesDefaultTimeoutScenario = Extract<ScenarioCase, { kind: 'request-overrides-default-timeout' }>;

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
  }, (error: unknown) => error instanceof TimeoutError && error.name === scenarioCase.expected.errorName);
}

async function runReportsTimeoutDetailsScenario(scenarioCase: ReportsTimeoutDetailsScenario): Promise<void> {
  await assert.rejects(async () => {
    await client.get(`${testUrl}${scenarioCase.input.request.url}`, { timeout: scenarioCase.input.request.timeout });
  }, (error: unknown) => {
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
  }, (error: unknown) => error instanceof TimeoutError && error.name === scenarioCase.expected.errorName);
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

async function runCase<Kind extends ScenarioCase['kind']>(scenarioCase: Extract<ScenarioCase, { kind: Kind }>): Promise<void> {
  await runnerMap[scenarioCase.kind](scenarioCase);
}

void describe('Timeout Feature', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
