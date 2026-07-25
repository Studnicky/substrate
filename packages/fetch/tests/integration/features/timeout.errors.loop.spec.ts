import assert from 'node:assert/strict';
import {
  after, before, describe, it
} from 'node:test';

import {
  FetchClient,
  TimeoutError
} from '../../../src/index.js';
import {
  startTestServer, stopTestServer
} from '../../helpers/test-server/index.js';

type RuntimeTag =
  | { __kind: 'infinity' }
  | { __kind: 'nan' }
  | { __kind: 'undefined' };

type RuntimeValue =
  | null
  | boolean
  | number
  | string
  | RuntimeTag
  | RuntimeValue[]
  | { [key: string]: RuntimeValue };

type RequestSignal =
  | { delayMs: number; kind: 'abort-after-ms' }
  | { kind: 'already-aborted' };

type RequestDefinition = {
  signal?: RequestSignal;
  timeout?: RuntimeValue;
  url: string;
};

type RequestExpectation =
  | { kind: 'rejects'; error: 'AbortError' | 'Error' | 'TimeoutError' | 'TypeError'; messageIncludes?: readonly string[]; timeoutMs?: number; urlIncludes?: string }
  | { kind: 'status'; status: number }
  | { kind: 'status-or-404' };

type SequencedStep = {
  expect: RequestExpectation;
  request: RequestDefinition;
};

type ScenarioCase = {
  clientConfig?: {
    baseURL?: string;
    timeout?: RuntimeValue;
  };
  description: string;
  expect:
    | { kind: 'create-ok' }
    | { kind: 'create-throws'; messageIncludes: readonly string[] }
    | RequestExpectation
    | { kind: 'parallel'; steps: readonly SequencedStep[] }
    | { kind: 'sequence'; steps: readonly SequencedStep[] };
  name: string;
  request?: RequestDefinition;
};

import scenarioGroups from './timeout.errors.scenarios.json';

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
    if ('__kind' in value) {
      if (value.__kind === 'undefined') {
        return undefined;
      }
      if (value.__kind === 'infinity') {
        return Number.POSITIVE_INFINITY;
      }
      if (value.__kind === 'nan') {
        return Number.NaN;
      }
      throw new Error(`Unknown runtime tag: ${value.__kind satisfies never}`);
    }

    const materialized: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      materialized[key] = materializeRuntimeValue(entry as RuntimeValue);
    }
    return materialized;
  }

  return value;
}

function materializeSignal(signal: RequestSignal | undefined): AbortSignal | undefined {
  if (signal === undefined) {
    return undefined;
  }

  if (signal.kind === 'already-aborted') {
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

function materializeRequest(request: RequestDefinition): {
  options: {
    signal?: AbortSignal;
    timeout?: unknown;
  };
  url: string;
} {
  const signal = materializeSignal(request.signal);
  const options: {
    signal?: AbortSignal;
    timeout?: unknown;
  } = {};

  if (request.timeout !== undefined) {
    options.timeout = materializeRuntimeValue(request.timeout);
  }

  if (signal !== undefined) {
    options.signal = signal;
  }

  return {
    options,
    url: materializeRuntimeValue(request.url) as string
  };
}

async function invokeRequest(clientInstance: ReturnType<typeof FetchClient.create>, request: RequestDefinition): Promise<Response> {
  const materialized = materializeRequest(request);
  return await clientInstance.get(materialized.url, materialized.options as never);
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

function assertRejectedExpectation(error: unknown, expectation: Extract<RequestExpectation, { kind: 'rejects' }>): void {
  assert.ok(error instanceof Error);

  if (expectation.error === 'TimeoutError') {
    assert.ok(error instanceof TimeoutError);
    assert.strictEqual(error.name, 'TimeoutError');
    if (expectation.timeoutMs !== undefined && error instanceof TimeoutError) {
      assert.strictEqual(error.timeoutMs, expectation.timeoutMs);
    }
  } else if (expectation.error === 'AbortError') {
    assert.strictEqual(error.name, 'AbortError');
  } else if (expectation.error === 'Error') {
    assert.ok(error.name.includes('Error'));
  } else {
    assert.ok(error instanceof TypeError || error.message.toLowerCase().includes('url'));
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
  if (expectation.kind === 'status') {
    assert.ok(result.ok, `expected successful response, received ${result.ok ? 'response' : result.error}`);
    assert.strictEqual(result.response.status, expectation.status);
    return;
  }

  if (expectation.kind === 'status-or-404') {
    assert.ok(result.ok, `expected successful response, received ${result.ok ? 'response' : result.error}`);
    assert.ok(result.response.status === 200 || result.response.status === 404);
    return;
  }

  assert.ok(!result.ok, 'expected request rejection');
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
  const clientConfig = {
    ...(scenarioCase.clientConfig?.baseURL === undefined ? {} : {
      baseURL: materializeRuntimeValue(scenarioCase.clientConfig.baseURL) as never
    }),
    ...(scenarioCase.clientConfig?.timeout === undefined ? {} : {
      timeout: materializeRuntimeValue(scenarioCase.clientConfig.timeout) as never
    })
  };

  if (scenarioCase.expect.kind === 'create-throws') {
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

  if (scenarioCase.expect.kind === 'create-ok') {
    assert.doesNotThrow(() => {
      FetchClient.create(clientConfig as never);
    });
    return;
  }

  const clientInstance = FetchClient.create(clientConfig as never);

  if (scenarioCase.expect.kind === 'sequence' || scenarioCase.expect.kind === 'parallel') {
    await runRequestGroup(clientInstance, scenarioCase.expect.steps, scenarioCase.expect.kind);
    return;
  }

  if (scenarioCase.request === undefined) {
    assert.fail('scenario request is required for request expectations');
  }

  await assertRequestExpectation(await inspectRequest(clientInstance, scenarioCase.request), scenarioCase.expect);
}

void describe('Timeout Error Scenarios', () => {
  for (const scenario of scenarioGroups.cases) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
