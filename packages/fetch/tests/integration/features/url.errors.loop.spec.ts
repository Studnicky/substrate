import type { ClientConfigInterface } from '../../../src/interfaces/ClientConfigInterface.js';

import { RuntimeError } from '@studnicky/errors/node';
import { Predicates } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import {
  after, before, describe, it
} from 'node:test';

import { FetchClient, InvalidUrlError, RequestFailedError } from '../../../src/node/index.js';
import { FetchClientConfiguration } from '../../../src/modules/FetchClientConfiguration.js';
import {
  startTestServer, stopTestServer
} from '../../helpers/test-server/index.js';
import { createRuntimeValueGuard } from '../../helpers/RuntimeValueGuard.js';

type RuntimeTag = { shape: 'undefined' };
type RuntimeValue =
  | null
  | boolean
  | number
  | string
  | RuntimeTag
  | RuntimeValue[]
  | { [key: string]: RuntimeValue };

type RequestDefinition = {
  url: string;
};

type RequestExpectation =
  | { shape: 'rejects'; error: 'AbortError' | 'Error' | 'TypeError'; messageIncludes?: readonly string[] }
  | { shape: 'rejects-native'; error: 'TypeError'; messageIncludes: readonly string[] }
  | { shape: 'status'; status: number };

type ScenarioCase = {
  description: string;
  expected:
    | { shape: 'create-ok' }
    | { shape: 'create-throws'; messageIncludes: readonly string[] }
    | RequestExpectation;
  input: {
    clientConfig?: {
      baseURL?: RuntimeValue;
    };
    request?: RequestDefinition;
  };
  name: string;
};

import scenarioGroups from './url.errors.scenarios.json' with { type: 'json' };

// Captured before `startTestServer()` monkey-patches `globalThis.fetch` with the
// in-process TestDispatcher, so 'rejects-native' cases can exercise the real
// runtime's URL handling instead of the mock transport.
const nativeFetch = globalThis.fetch;

let testUrl: string;

void before(async () => {
  testUrl = await startTestServer();
});

void after(async () => {
  await stopTestServer();
});

const runtimeValueGuard = createRuntimeValueGuard(['undefined'] as const);

function isRequestDefinition(value: unknown): value is RequestDefinition {
  return Predicates.isObject(value) && typeof value.url === 'string';
}

function isMessageIncludes(value: unknown): value is readonly string[] {
  return value === undefined || (Array.isArray(value) && value.every((fragment) => { return typeof fragment === 'string'; }));
}

function isRequestExpectation(value: unknown): value is RequestExpectation {
  if (!Predicates.isObject(value)) {
    return false;
  }
  if (value.shape === 'rejects') {
    return (value.error === 'AbortError' || value.error === 'Error' || value.error === 'TypeError') && isMessageIncludes(value.messageIncludes);
  }
  if (value.shape === 'rejects-native') {
    return value.error === 'TypeError' && Array.isArray(value.messageIncludes) && value.messageIncludes.every((fragment) => { return typeof fragment === 'string'; });
  }
  if (value.shape === 'status') {
    return typeof value.status === 'number';
  }
  return false;
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
  return isRequestExpectation(value);
}

function isScenarioCase(value: unknown): value is ScenarioCase {
  if (!Predicates.isObject(value) || typeof value.description !== 'string' || typeof value.name !== 'string') {
    return false;
  }
  if (!isScenarioExpectation(value.expected) || !Predicates.isObject(value.input)) {
    return false;
  }
  if (value.input.clientConfig !== undefined) {
    if (!Predicates.isObject(value.input.clientConfig)) {
      return false;
    }
    if (value.input.clientConfig.baseURL !== undefined && !runtimeValueGuard.isRuntimeValue(value.input.clientConfig.baseURL)) {
      return false;
    }
  }
  return value.input.request === undefined || isRequestDefinition(value.input.request);
}

function isScenarioFile(value: unknown): value is { cases: ScenarioCase[] } {
  return Predicates.isObject(value) && Array.isArray(value.cases) && value.cases.every(isScenarioCase);
}

function requireScenarioFile(value: unknown): { cases: ScenarioCase[] } {
  if (!isScenarioFile(value)) {
    throw RuntimeError.create('url.errors.scenarios.json does not match the expected scenario case shape');
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
      const exhaustiveCheck: never = value.shape;
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

function materializeRequest(request: RequestDefinition): string {
  return request.url.replaceAll('__TEST_URL__', testUrl);
}

async function inspectRequest(clientInstance: ReturnType<typeof FetchClient.create>, request: RequestDefinition): Promise<
  | { ok: true; response: Response }
  | { error: unknown; ok: false }
> {
  try {
    return {
      ok: true,
      response: await clientInstance.get(materializeRequest(request))
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

  if (expectation.error === 'AbortError') {
    assert.strictEqual(error.name, 'AbortError');
  } else if (expectation.error === 'Error') {
    assert.ok(error.name.includes('Error'));
  } else {
    assert.ok(error instanceof InvalidUrlError || (error instanceof RequestFailedError && error.cause instanceof TypeError));
  }

  for (const fragment of expectation.messageIncludes ?? []) {
    assert.ok(error.message.toLowerCase().includes(fragment.toLowerCase()));
  }
}

/**
 * Runs `action` with `globalThis.fetch` restored to the real runtime fetch, bypassing
 * the TestDispatcher mock installed by `startTestServer()`. Used for cases whose
 * contract lives entirely in the native fetch/undici runtime (e.g. rejecting URLs
 * that carry userinfo) rather than in this package's own source.
 */
async function withNativeFetch<T>(action: () => Promise<T>): Promise<T> {
  const patchedFetch = globalThis.fetch;
  globalThis.fetch = nativeFetch;
  try {
    return await action();
  } finally {
    globalThis.fetch = patchedFetch;
  }
}

function assertRejectsNative(
  result: Awaited<ReturnType<typeof inspectRequest>>,
  expectation: Extract<RequestExpectation, { shape: 'rejects-native' }>
): void {
  assert.ok(!result.ok, 'expected the native runtime to reject the credentialed URL before any request reached the network');
  assert.ok(result.error instanceof RequestFailedError);
  assert.ok(result.error.cause instanceof TypeError);
  assert.equal(result.error.cause.name, expectation.error);
  for (const fragment of expectation.messageIncludes) {
    assert.ok(result.error.message.toLowerCase().includes(fragment.toLowerCase()));
  }
}

async function assertRequestExpectation(
  result: Awaited<ReturnType<typeof inspectRequest>>,
  expectation: Exclude<RequestExpectation, { shape: 'rejects-native' }>
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

function materializeBaseURL(value: RuntimeValue | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  const materialized = materializeRuntimeValue(value);
  if (typeof materialized !== 'string') {
    throw RuntimeError.create('expected clientConfig.baseURL to materialize to a string for a live FetchClient');
  }
  return materialized;
}

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  const { expected } = scenarioCase;
  const rawBaseURL = scenarioCase.input.clientConfig?.baseURL;

  if (expected.shape === 'create-throws') {
    const config = rawBaseURL === undefined ? {} : { baseURL: materializeRuntimeValue(rawBaseURL) };
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

  if (expected.shape === 'create-ok') {
    const config = rawBaseURL === undefined ? {} : { baseURL: materializeRuntimeValue(rawBaseURL) };
    assert.doesNotThrow(() => {
      FetchClientConfiguration.intake(config);
    });
    return;
  }

  const baseURL = materializeBaseURL(rawBaseURL);
  const clientConfig: ClientConfigInterface = baseURL === undefined ? {} : { baseURL };
  const clientInstance = FetchClient.create(clientConfig);

  const { request } = scenarioCase.input;
  if (request === undefined) {
    assert.fail('scenario request is required for request expectations');
  }

  if (expected.shape === 'rejects-native') {
    const result = await withNativeFetch(() => inspectRequest(clientInstance, request));
    assertRejectsNative(result, expected);
    return;
  }

  await assertRequestExpectation(await inspectRequest(clientInstance, request), expected);
}

void describe('URL Error Scenarios', () => {
  for (const scenario of requireScenarioFile(scenarioGroups).cases) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
