import assert from 'node:assert/strict';
import {
  after, before, describe, it
} from 'node:test';

import { FetchClient } from '../../../src/index.js';
import {
  startTestServer, stopTestServer
} from '../../helpers/test-server/index.js';

type RuntimeTag = { __shape: 'undefined' };
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
  | { shape: 'status'; status: number }
  | { shape: 'status-or-404' };

type ScenarioCase = {
  clientConfig?: {
    baseURL?: RuntimeValue;
  };
  description: string;
  expect:
    | { shape: 'create-ok' }
    | { shape: 'create-throws'; messageIncludes: readonly string[] }
    | RequestExpectation;
  name: string;
  request?: RequestDefinition;
};

import scenarioGroups from './url.errors.scenarios.json';

let testUrl: string;

void before(async () => {
  testUrl = await startTestServer();
});

void after(async () => {
  await stopTestServer();
});

function materializeRuntimeValue(value: RuntimeValue): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => { return materializeRuntimeValue(item); });
  }

  if (typeof value === 'string') {
    return value.replaceAll('__TEST_URL__', testUrl);
  }

  if (value !== null && typeof value === 'object') {
    if ('__shape' in value) {
      if (value.__shape === 'undefined') {
        return undefined;
      }
      throw new Error(`Unknown runtime tag: ${value.__shape satisfies never}`);
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

function assertRejectedExpectation(error: unknown, expectation: Extract<RequestExpectation, { shape: 'rejects' }>): void {
  assert.ok(error instanceof Error);

  if (expectation.error === 'AbortError') {
    assert.strictEqual(error.name, 'AbortError');
  } else if (expectation.error === 'Error') {
    assert.ok(error.name.includes('Error'));
  } else {
    assert.ok(error instanceof TypeError || error.message.includes('URL'));
  }

  for (const fragment of expectation.messageIncludes ?? []) {
    assert.ok(error.message.toLowerCase().includes(fragment.toLowerCase()));
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

  if (expectation.shape === 'status-or-404') {
    assert.ok(result.ok, `expected successful response, received ${result.ok ? 'response' : result.error}`);
    assert.ok(result.response.status === 200 || result.response.status === 404);
    return;
  }

  assert.ok(!result.ok, 'expected request rejection');
  assertRejectedExpectation(result.error, expectation);
}

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  const clientConfig = (scenarioCase.clientConfig?.baseURL === undefined ? {} : {
      baseURL: materializeRuntimeValue(scenarioCase.clientConfig.baseURL) as never
    });

  if (scenarioCase.expect.shape === 'create-throws') {
    assert.throws(() => {
      FetchClient.create(clientConfig as never);
    }, (error: Error) => {
      for (const fragment of scenarioCase.expect.messageIncludes) {
        assert.ok(error.message.toLowerCase().includes(fragment.toLowerCase()));
      }
      return true;
    });
    return;
  }

  if (scenarioCase.expect.shape === 'create-ok') {
    assert.doesNotThrow(() => {
      FetchClient.create(clientConfig as never);
    });
    return;
  }

  const clientInstance = FetchClient.create(clientConfig as never);

  if (scenarioCase.request === undefined) {
    assert.fail('scenario request is required for request expectations');
  }

  await assertRequestExpectation(await inspectRequest(clientInstance, scenarioCase.request), scenarioCase.expect);
}

void describe('URL Error Scenarios', () => {
  for (const scenario of scenarioGroups.cases) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
