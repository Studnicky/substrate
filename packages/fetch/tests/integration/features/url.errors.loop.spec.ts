import assert from 'node:assert/strict';
import {
  after, before, describe, it
} from 'node:test';

import { FetchClient } from '../../../src/index.js';
import {
  startTestServer, stopTestServer
} from '../../helpers/test-server/index.js';

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
      throw new Error(`Unknown runtime tag: ${JSON.stringify(exhaustiveCheck)}`);
    }

    const materialized: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      materialized[key] = materializeRuntimeValue(entry as RuntimeValue);
    }
    return materialized;
  }

  return value;
}

function materializeRequest(request: RequestDefinition): string {
  return materializeRuntimeValue(request.url) as string;
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
    assert.ok(error instanceof TypeError);
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
  assert.ok(result.error instanceof TypeError);
  assert.equal(result.error.name, expectation.error);
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

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  const { expected } = scenarioCase;
  const clientConfig = (scenarioCase.input.clientConfig?.baseURL === undefined ? {} : {
      baseURL: materializeRuntimeValue(scenarioCase.input.clientConfig.baseURL) as never
    });

  if (expected.shape === 'create-throws') {
    assert.throws(() => {
      FetchClient.create(clientConfig as never);
    }, (error: Error) => {
      for (const fragment of expected.messageIncludes) {
        assert.ok(error.message.toLowerCase().includes(fragment.toLowerCase()));
      }
      return true;
    });
    return;
  }

  if (expected.shape === 'create-ok') {
    assert.doesNotThrow(() => {
      FetchClient.create(clientConfig as never);
    });
    return;
  }

  const clientInstance = FetchClient.create(clientConfig as never);

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
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
