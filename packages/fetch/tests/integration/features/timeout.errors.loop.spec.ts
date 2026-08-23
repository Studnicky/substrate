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
  | { __shape: 'infinity' }
  | { __shape: 'nan' }
  | { __shape: 'undefined' };

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

function isRuntimeTag(value: RuntimeValue): value is RuntimeTag {
  return typeof value === 'object' && value !== null && '__shape' in value;
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
      if (value.__shape === 'undefined') {
        return undefined;
      }
      if (value.__shape === 'infinity') {
        return Number.POSITIVE_INFINITY;
      }
      if (value.__shape === 'nan') {
        return Number.NaN;
      }
      const exhaustiveCheck: never = value;
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
  const clientConfig = {
    ...(scenarioCase.input.clientConfig?.baseURL === undefined ? {} : {
      baseURL: materializeRuntimeValue(scenarioCase.input.clientConfig.baseURL) as never
    }),
    ...(scenarioCase.input.clientConfig?.timeout === undefined ? {} : {
      timeout: materializeRuntimeValue(scenarioCase.input.clientConfig.timeout) as never
    })
  };

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
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
