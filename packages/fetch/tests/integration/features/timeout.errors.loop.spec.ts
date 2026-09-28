import type { ClientConfigInterface } from '../../../src/interfaces/ClientConfigInterface.js';
import type { FetchOptionsInterface } from '../../../src/interfaces/FetchOptionsInterface.js';

import { RuntimeError } from '@studnicky/errors/node';
import { Predicates } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import {
  after, before, describe, it
} from 'node:test';

import {
  FetchClient,
  TimeoutError
} from '../../../src/node/index.js';
import { FetchClientConfiguration } from '../../../src/modules/FetchClientConfiguration.js';
import {
  startTestServer, stopTestServer
} from '../../helpers/test-server/index.js';
import { createRuntimeValueGuard } from '../../helpers/RuntimeValueGuard.js';

type RuntimeTag =
  | { shape: 'infinity' }
  | { shape: 'nan' }
  | { shape: 'undefined' };

type RuntimeValue =
  | null
  | boolean
  | number
  | string
  | RuntimeTag
  | RuntimeValue[]
  | { [key: string]: RuntimeValue };

type RequestSignal =
  | { delayMs: number; shape: 'abort-after-ms' }
  | { shape: 'already-aborted' };

type RequestDefinition = {
  signal?: RequestSignal;
  timeout?: RuntimeValue;
  url: string;
};

type RequestExpectation =
  | { shape: 'rejects'; error: 'AbortError' | 'Error' | 'TimeoutError'; messageIncludes?: readonly string[]; timeoutMs?: number; urlIncludes?: string }
  | { shape: 'status'; status: number };

type SequencedStep = {
  expect: RequestExpectation;
  request: RequestDefinition;
};

type ScenarioCase = {
  description: string;
  expected:
    | { shape: 'create-ok' }
    | { shape: 'create-throws'; messageIncludes: readonly string[] }
    | RequestExpectation
    | { shape: 'parallel'; steps: readonly SequencedStep[] }
    | { shape: 'sequence'; steps: readonly SequencedStep[] };
  input: {
    clientConfig?: {
      baseURL?: string;
      timeout?: RuntimeValue;
    };
    request?: RequestDefinition;
  };
  name: string;
};

import scenarioGroups from './timeout.errors.scenarios.json' with { type: 'json' };

let testUrl: string;

void before(async () => {
  testUrl = await startTestServer();
});

void after(async () => {
  await stopTestServer();
});

const runtimeValueGuard = createRuntimeValueGuard(['infinity', 'nan', 'undefined'] as const);

function isMessageIncludes(value: unknown): value is readonly string[] {
  return value === undefined || (Array.isArray(value) && value.every((fragment) => { return typeof fragment === 'string'; }));
}

function isRequestSignal(value: unknown): value is RequestSignal {
  if (!Predicates.isObject(value)) {
    return false;
  }
  if (value.shape === 'already-aborted') {
    return true;
  }
  return value.shape === 'abort-after-ms' && typeof value.delayMs === 'number';
}

function isRequestDefinition(value: unknown): value is RequestDefinition {
  if (!Predicates.isObject(value) || typeof value.url !== 'string') {
    return false;
  }
  if (value.timeout !== undefined && !runtimeValueGuard.isRuntimeValue(value.timeout)) {
    return false;
  }
  return value.signal === undefined || isRequestSignal(value.signal);
}

function isRequestExpectation(value: unknown): value is RequestExpectation {
  if (!Predicates.isObject(value)) {
    return false;
  }
  if (value.shape === 'status') {
    return typeof value.status === 'number';
  }
  if (value.shape !== 'rejects') {
    return false;
  }
  if (value.error !== 'AbortError' && value.error !== 'Error' && value.error !== 'TimeoutError') {
    return false;
  }
  if (!isMessageIncludes(value.messageIncludes) || (value.timeoutMs !== undefined && typeof value.timeoutMs !== 'number')) {
    return false;
  }
  return value.urlIncludes === undefined || typeof value.urlIncludes === 'string';
}

function isSequencedStep(value: unknown): value is SequencedStep {
  return Predicates.isObject(value) && isRequestExpectation(value.expect) && isRequestDefinition(value.request);
}

function isSteps(value: unknown): value is readonly SequencedStep[] {
  return Array.isArray(value) && value.every(isSequencedStep);
}

function isScenarioExpectation(value: unknown): value is ScenarioCase['expected'] {
  if (!Predicates.isObject(value)) {
    return false;
  }
  if (value.shape === 'create-ok') {
    return true;
  }
  if (value.shape === 'create-throws') {
    return Array.isArray(value.messageIncludes) && value.messageIncludes.every((fragment) => { return typeof fragment === 'string'; });
  }
  if (value.shape === 'parallel' || value.shape === 'sequence') {
    return isSteps(value.steps);
  }
  return isRequestExpectation(value);
}

function isClientConfigInput(value: unknown): value is { baseURL?: string; timeout?: RuntimeValue } {
  if (!Predicates.isObject(value)) {
    return false;
  }
  if (value.baseURL !== undefined && typeof value.baseURL !== 'string') {
    return false;
  }
  return value.timeout === undefined || runtimeValueGuard.isRuntimeValue(value.timeout);
}

function isScenarioCase(value: unknown): value is ScenarioCase {
  if (!Predicates.isObject(value) || typeof value.description !== 'string' || typeof value.name !== 'string') {
    return false;
  }
  if (!isScenarioExpectation(value.expected) || !Predicates.isObject(value.input)) {
    return false;
  }
  if (value.input.clientConfig !== undefined && !isClientConfigInput(value.input.clientConfig)) {
    return false;
  }
  return value.input.request === undefined || isRequestDefinition(value.input.request);
}

function isScenarioFile(value: unknown): value is { cases: ScenarioCase[] } {
  return Predicates.isObject(value) && Array.isArray(value.cases) && value.cases.every(isScenarioCase);
}

function requireScenarioFile(value: unknown): { cases: ScenarioCase[] } {
  if (!isScenarioFile(value)) {
    throw RuntimeError.create('timeout.errors.scenarios.json does not match the expected scenario case shape');
  }
  return value;
}

function isRuntimeTag(value: RuntimeValue): value is RuntimeTag {
  return typeof value === 'object' && value !== null && 'shape' in value;
}

function materializeRuntimeValue(value: RuntimeValue): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => { return materializeRuntimeValue(item); });
  }

  if (typeof value === 'string') {
    return value.replaceAll('__TEST_URL__', testUrl);
  }

  if (value !== null && typeof value === 'object') {
    if (isRuntimeTag(value)) {
      if (value.shape === 'undefined') {
        return undefined;
      }
      if (value.shape === 'infinity') {
        return Number.POSITIVE_INFINITY;
      }
      if (value.shape === 'nan') {
        return Number.NaN;
      }
      const exhaustiveCheck: never = value;
      throw RuntimeError.create(`Unknown runtime tag: ${JSON.stringify(exhaustiveCheck)}`);
    }

    const materialized: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      materialized[key] = materializeRuntimeValue(entry);
    }
    return materialized;
  }

  return value;
}

function materializeSignal(signal: RequestSignal | undefined): AbortSignal | undefined {
  if (signal === undefined) {
    return undefined;
  }

  if (signal.shape === 'already-aborted') {
    const controller = new AbortController();
    controller.abort();
    return controller.signal;
  }

  const controller = new AbortController();
  setTimeout(() => {
    controller.abort();
  }, signal.delayMs);
  return controller.signal;
}

function requireNumber(value: unknown, message: string): number {
  if (typeof value !== 'number') {
    throw RuntimeError.create(message);
  }
  return value;
}

function materializeTimeout(value: RuntimeValue | undefined): number | undefined {
  return value === undefined ? undefined : requireNumber(materializeRuntimeValue(value), 'expected timeout to materialize to a number for a live FetchClient');
}

function materializeRequest(request: RequestDefinition): {
  options: FetchOptionsInterface;
  url: string;
} {
  const signal = materializeSignal(request.signal);
  const timeout = materializeTimeout(request.timeout);
  const options: FetchOptionsInterface = {
    ...(timeout === undefined ? {} : { timeout }),
    ...(signal === undefined ? {} : { signal })
  };

  return {
    options,
    url: request.url.replaceAll('__TEST_URL__', testUrl)
  };
}

async function invokeRequest(clientInstance: ReturnType<typeof FetchClient.create>, request: RequestDefinition): Promise<Response> {
  const materialized = materializeRequest(request);
  return await clientInstance.get(materialized.url, materialized.options);
}

async function inspectRequest(clientInstance: ReturnType<typeof FetchClient.create>, request: RequestDefinition): Promise<
  | { ok: true; response: Response }
  | { error: unknown; ok: false }
> {
  try {
    return {
      ok: true,
      response: await invokeRequest(clientInstance, request)
    };
  } catch (error) {
    return {
      error,
      ok: false
    };
  }
}

function assertRejectedExpectation(error: Error, expectation: Extract<RequestExpectation, { shape: 'rejects' }>): void {
  assert.ok(error instanceof Error);

  if (expectation.error === 'TimeoutError') {
    assert.ok(error instanceof TimeoutError);
    assert.strictEqual(error.name, 'TimeoutError');
    if (expectation.timeoutMs !== undefined && error instanceof TimeoutError) {
      assert.strictEqual(error.timeoutMs, expectation.timeoutMs);
    }
  } else if (expectation.error === 'AbortError') {
    assert.strictEqual(error.name, 'AbortError');
  } else {
    assert.ok(error.name.includes('Error'));
  }

  for (const fragment of expectation.messageIncludes ?? []) {
    assert.ok(error.message.toLowerCase().includes(fragment.toLowerCase()));
  }

  if (expectation.urlIncludes !== undefined && 'url' in error && typeof error.url === 'string') {
    assert.ok(error.url.includes(expectation.urlIncludes));
  }
}

async function assertRequestExpectation(
  result: Awaited<ReturnType<typeof inspectRequest>>,
  expectation: RequestExpectation
): Promise<void> {
  if (expectation.shape === 'status') {
    assert.ok(result.ok, `expected successful response, received ${result.ok ? 'response' : result.error}`);
    assert.strictEqual(result.response.status, expectation.status);
    return;
  }

  assert.ok(!result.ok, 'expected request rejection');
  assert.ok(result.error instanceof Error);
  assertRejectedExpectation(result.error, expectation);
}

async function runRequestGroup(
  clientInstance: ReturnType<typeof FetchClient.create>,
  steps: readonly SequencedStep[],
  mode: 'parallel' | 'sequence'
): Promise<void> {
  if (mode === 'parallel') {
    const results = await Promise.all(steps.map(async (step) => {
      return {
        expectation: step.expect,
        outcome: await inspectRequest(clientInstance, step.request)
      };
    }));

    for (const result of results) {
      await assertRequestExpectation(result.outcome, result.expectation);
    }
    return;
  }

  for (const step of steps) {
    await assertRequestExpectation(await inspectRequest(clientInstance, step.request), step.expect);
  }
}

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  const { expected } = scenarioCase;
  const rawClientConfig = scenarioCase.input.clientConfig;

  if (expected.shape === 'create-throws' || expected.shape === 'create-ok') {
    const config = {
      ...(rawClientConfig?.baseURL === undefined ? {} : { baseURL: rawClientConfig.baseURL }),
      ...(rawClientConfig?.timeout === undefined ? {} : { timeout: materializeRuntimeValue(rawClientConfig.timeout) })
    };

    if (expected.shape === 'create-throws') {
      assert.throws(() => {
        FetchClientConfiguration.intake(config);
      }, (error: Error) => {
        for (const fragment of expected.messageIncludes) {
          assert.ok(error.message.toLowerCase().includes(fragment.toLowerCase()));
        }
        return true;
      });
      return;
    }

    assert.doesNotThrow(() => {
      FetchClientConfiguration.intake(config);
    });
    return;
  }

  const timeout = materializeTimeout(rawClientConfig?.timeout);
  const clientConfig: ClientConfigInterface = {
    ...(rawClientConfig?.baseURL === undefined ? {} : { baseURL: rawClientConfig.baseURL.replaceAll('__TEST_URL__', testUrl) }),
    ...(timeout === undefined ? {} : { timeout })
  };
  const clientInstance = FetchClient.create(clientConfig);

  if (expected.shape === 'sequence' || expected.shape === 'parallel') {
    await runRequestGroup(clientInstance, expected.steps, expected.shape);
    return;
  }

  if (scenarioCase.input.request === undefined) {
    assert.fail('scenario request is required for request expectations');
  }

  await assertRequestExpectation(await inspectRequest(clientInstance, scenarioCase.input.request), expected);
}

void describe('Timeout Error Scenarios', () => {
  for (const scenario of requireScenarioFile(scenarioGroups).cases) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
