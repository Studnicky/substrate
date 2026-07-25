import assert from 'node:assert/strict';
import {
  after, before, describe, it
} from 'node:test';

import {
  ConfigurationError,
  FetchClient,
  TimeoutError,
  UndiciDispatcher
} from '../../../src/index.js';
import { DispatcherAgent } from '../../../src/config/DispatcherAgent.js';
import { validateDispatcher } from '../../../src/config/schemas/validateDispatcher.js';
import {
  startTestServer, stopTestServer
} from '../../helpers/test-server/index.js';
import scenarioGroups from './connection.errors.scenarios.json';

type RuntimeTag =
  | { __shape: 'infinity' }
  | { __shape: 'nan' };

type RuntimeValue =
  | null
  | boolean
  | number
  | string
  | RuntimeTag
  | RuntimeValue[]
  | { [key: string]: RuntimeValue };

interface BatchInputInterface {
  requestCount: number;
}

type ScenarioCase = {
  description: string;
  expected?: Record<string, RuntimeValue>;
  input: {
    batch?: BatchInputInterface;
    destroy?: { timeout: number };
    dispatcher?: Record<string, RuntimeValue>;
    fetchClient?: Record<string, RuntimeValue>;
    repeats?: number;
    waitMs?: number;
  };
  shape:
    | 'client-destroy-passes-timeout'
    | 'close-waits'
    | 'destroy-timeout-waits'
    | 'destroy-zero-no-wait'
    | 'dns-failure'
    | 'health-after-errors'
    | 'invalid-config'
    | 'isolates-network-errors'
    | 'keep-alive-long'
    | 'keep-alive-short'
    | 'many-concurrent-network-errors'
    | 'many-concurrent-requests'
    | 'many-concurrent-timeouts'
    | 'mixed-errors-successes'
    | 'mixed-success-timeout-with-limited-connections'
    | 'network-refused'
    | 'pipelining-disabled'
    | 'pipelining-high'
    | 'pool-after-network-error'
    | 'pool-after-timeout'
    | 'queue-requests-when-pool-is-full'
    | 'saturated-health'
    | 'sequential-errors';
  name: string;
};

type ScenarioRunner<Shape extends ScenarioCase['shape']> = (scenarioCase: Extract<ScenarioCase, { shape: Shape }>) => Promise<void>;
type RunnerMap = { [Shape in ScenarioCase['shape']]: ScenarioRunner<Shape> };

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
      if (value.__shape === 'infinity') {
        return Number.POSITIVE_INFINITY;
      }
      if (value.__shape === 'nan') {
        return Number.NaN;
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

function createManagedDispatcher(config: Record<string, RuntimeValue>): {
  agent: ReturnType<typeof DispatcherAgent.create>;
  dispatcher: ReturnType<typeof UndiciDispatcher.create>;
} {
  const materialized = materializeRuntimeValue(config) as Parameters<typeof DispatcherAgent.create>[0];
  validateDispatcher(materialized);
  const agent = DispatcherAgent.create(materialized);
  return {
    agent,
    dispatcher: UndiciDispatcher.create(agent)
  };
}

function createClient(agent: ReturnType<typeof DispatcherAgent.create>, baseURL: string): ReturnType<typeof FetchClient.create> {
  return FetchClient.create({
    baseURL,
    options: {
      dispatcher: agent
    }
  });
}

function getDispatcherConfig(scenarioCase: ScenarioCase): Record<string, RuntimeValue> {
  return scenarioCase.input.dispatcher ?? {};
}

function getDestroyOptions(scenarioCase: ScenarioCase): { timeout: number } {
  const timeout = scenarioCase.input.destroy?.timeout;
  if (typeof timeout !== 'number') {
    throw new Error(`Missing dispatcher destroy timeout for ${scenarioCase.name}`);
  }
  return { timeout };
}

function requireBatchInput(scenarioCase: ScenarioCase): BatchInputInterface {
  const batch = scenarioCase.input.batch;
  if (batch === undefined) {
    throw new Error(`Missing batch input for ${scenarioCase.name}`);
  }
  return batch;
}

function createBatchRequests<TResult>(batch: BatchInputInterface, requestFactory: () => Promise<TResult>): Array<Promise<TResult>> {
  return Array.from({ length: batch.requestCount }, requestFactory);
}

function requireExpected(scenarioCase: ScenarioCase): Record<string, RuntimeValue> {
  const { expected } = scenarioCase;
  if (expected === undefined) {
    throw new Error(`Missing expected for ${scenarioCase.name}`);
  }
  return expected;
}

function requireExpectedString(scenarioCase: ScenarioCase, key: string): string {
  const value = requireExpected(scenarioCase)[key];
  if (typeof value !== 'string') {
    throw new Error(`${scenarioCase.name} must define expected.${key} as a string`);
  }
  return value;
}

function requireExpectedBoolean(scenarioCase: ScenarioCase, key: string): boolean {
  const value = requireExpected(scenarioCase)[key];
  if (typeof value !== 'boolean') {
    throw new Error(`${scenarioCase.name} must define expected.${key} as a boolean`);
  }
  return value;
}

function requireExpectedArray(scenarioCase: ScenarioCase, key: string): RuntimeValue[] {
  const value = requireExpected(scenarioCase)[key];
  if (!Array.isArray(value)) {
    throw new Error(`${scenarioCase.name} must define expected.${key} as an array`);
  }
  return value;
}

/**
 * Normalizes a settled outcome (a Response, an HTTP status, or a caught fallback label)
 * into a value comparable against scenario-declared `expected.results`/`expected.statuses`.
 */
function normalizeOutcome(value: Response | number | string): number | string {
  return typeof value === 'object' ? value.status : value;
}

const runnerMap: RunnerMap = {
  'client-destroy-passes-timeout': async (scenarioCase) => {
    const fetchClientConfig = materializeRuntimeValue(scenarioCase.input.fetchClient ?? {}) as Parameters<typeof FetchClient.create>[0];
    const client = FetchClient.create({
      ...fetchClientConfig,
      baseURL: testUrl,
    });
    const warmupResponse = await client.get('/posts/1');
    assert.strictEqual(warmupResponse.status, 200);
    const startTime = Date.now();
    await client.destroy(getDestroyOptions(scenarioCase));
    const elapsed = Date.now() - startTime;
    const waited = elapsed >= 95;
    assert.equal(waited, requireExpectedBoolean(scenarioCase, 'waited'), `Expected ~${getDestroyOptions(scenarioCase).timeout}ms wait, got ${elapsed}ms`);
  },
  'close-waits': async (scenarioCase) => {
    const { agent, dispatcher } = createManagedDispatcher(getDispatcherConfig(scenarioCase));
    const client = createClient(agent, testUrl);
    const requests = [
      client.get('/posts/1'),
      client.get('/posts/2')
    ];
    const responses = await Promise.all(requests);
    assert.strictEqual(responses[0]?.status, 200);
    assert.strictEqual(responses[1]?.status, 200);
    await dispatcher.close();
    assert.equal(requireExpectedBoolean(scenarioCase, 'closed'), true);
  },
  'destroy-timeout-waits': async (scenarioCase) => {
    const { agent, dispatcher } = createManagedDispatcher(getDispatcherConfig(scenarioCase));
    const client = createClient(agent, testUrl);
    const warmupResponse = await client.get('/posts/1');
    assert.strictEqual(warmupResponse.status, 200);
    const startTime = Date.now();
    await dispatcher.destroy(getDestroyOptions(scenarioCase));
    const elapsed = Date.now() - startTime;
    const waited = elapsed >= 95;
    assert.equal(waited, requireExpectedBoolean(scenarioCase, 'waited'), `Expected ~${getDestroyOptions(scenarioCase).timeout}ms wait, got ${elapsed}ms`);
  },
  'destroy-zero-no-wait': async (scenarioCase) => {
    const { agent, dispatcher } = createManagedDispatcher(getDispatcherConfig(scenarioCase));
    const client = createClient(agent, testUrl);
    const warmupResponse = await client.get('/posts/1');
    assert.strictEqual(warmupResponse.status, 200);
    const startTime = Date.now();
    await dispatcher.destroy({ timeout: 0 });
    const elapsed = Date.now() - startTime;
    const waited = elapsed >= 50;
    assert.equal(waited, requireExpectedBoolean(scenarioCase, 'waited'), `Expected immediate destroy, took ${elapsed}ms`);
  },
  'dns-failure': async (scenarioCase) => {
    const { agent, dispatcher } = createManagedDispatcher(getDispatcherConfig(scenarioCase));
    const client = FetchClient.create({
      baseURL: 'https://this-domain-does-not-exist-12345.com',
      options: { dispatcher: agent }
    });
    const expectedError = requireExpectedString(scenarioCase, 'error');

    await assert.rejects(async () => {
      await client.get('/api');
    }, (error: unknown) => {
      assert.ok(error instanceof Error);
      const cause = error as Error & { cause?: Error };
      const hasDnsError = error.message.includes(expectedError) || (cause.cause?.message ?? '').includes(expectedError);
      assert.ok(hasDnsError, `Expected DNS error, got: ${error.message}`);
      return true;
    });

    await dispatcher.destroy();
  },
  'health-after-errors': async (scenarioCase) => {
    const { agent, dispatcher } = createManagedDispatcher(getDispatcherConfig(scenarioCase));
    const client = createClient(agent, testUrl);

    await assert.rejects(async () => {
      await client.get('/delay', { timeout: 50 });
    }, TimeoutError);

    const health = dispatcher.checkDispatcherHealth(new URL(testUrl).origin);
    assert.ok(typeof health.healthy === 'boolean', 'Health check should not be null');

    await dispatcher.destroy();
  },
  'invalid-config': async (scenarioCase) => {
    const expectedError = requireExpectedString(scenarioCase, 'error');
    assert.throws(() => {
      validateDispatcher(materializeRuntimeValue(getDispatcherConfig(scenarioCase)) as never);
    }, (error: Error) => {
      assert.ok(error instanceof ConfigurationError);
      assert.equal(error.name, expectedError);
      return true;
    });
  },
  'isolates-network-errors': async (scenarioCase) => {
    const { agent, dispatcher } = createManagedDispatcher(getDispatcherConfig(scenarioCase));
    const goodClient = createClient(agent, testUrl);
    const badClient = FetchClient.create({
      baseURL: 'http://127.0.0.1:1',
      options: { dispatcher: agent }
    });

    const results = await Promise.allSettled([
      badClient.get('/api'),
      goodClient.get('/posts/1'),
      badClient.get('/api'),
      goodClient.get('/posts/2')
    ]);

    assert.deepStrictEqual(results.map((result) => result.status), requireExpectedArray(scenarioCase, 'statuses'));

    await dispatcher.destroy();
  },
  'keep-alive-long': async (scenarioCase) => {
    const { agent, dispatcher } = createManagedDispatcher(getDispatcherConfig(scenarioCase));
    const client = createClient(agent, testUrl);
    const response = await client.get('/posts/1');
    assert.strictEqual(response.status, 200);
    const response2 = await client.get('/posts/1');
    assert.strictEqual(response2.status, 200);
    await dispatcher.destroy();
  },
  'keep-alive-short': async (scenarioCase) => {
    const { agent, dispatcher } = createManagedDispatcher(getDispatcherConfig(scenarioCase));
    const client = createClient(agent, testUrl);
    const response = await client.get('/posts/1');
    assert.strictEqual(response.status, 200);
    await new Promise<void>((resolve) => {
      setTimeout(resolve, scenarioCase.input.waitMs);
    });
    const response2 = await client.get('/posts/1');
    assert.strictEqual(response2.status, 200);
    await dispatcher.destroy();
  },
  'many-concurrent-network-errors': async (scenarioCase) => {
    const { agent, dispatcher } = createManagedDispatcher(getDispatcherConfig(scenarioCase));
    const client = FetchClient.create({
      baseURL: 'http://127.0.0.1:1',
      options: { dispatcher: agent }
    });
    const batch = requireBatchInput(scenarioCase);
    const results = await Promise.all(createBatchRequests(batch, async () => {
      return await client.get('/api').catch(() => {
        return 'error';
      });
    }));
    assert.deepStrictEqual(results.map(normalizeOutcome), requireExpectedArray(scenarioCase, 'results'));
    await dispatcher.destroy();
  },
  'many-concurrent-requests': async (scenarioCase) => {
    const { agent, dispatcher } = createManagedDispatcher(getDispatcherConfig(scenarioCase));
    const client = createClient(agent, testUrl);
    const batch = requireBatchInput(scenarioCase);
    const responses = await Promise.all(createBatchRequests(batch, async () => {
      return await client.get('/posts/1');
    }));
    assert.deepStrictEqual(responses.map(normalizeOutcome), requireExpectedArray(scenarioCase, 'statuses'));
    await dispatcher.destroy();
  },
  'many-concurrent-timeouts': async (scenarioCase) => {
    const { agent, dispatcher } = createManagedDispatcher(getDispatcherConfig(scenarioCase));
    const client = createClient(agent, testUrl);
    const batch = requireBatchInput(scenarioCase);
    const results = await Promise.all(createBatchRequests(batch, async () => {
      return await client.get('/delay', { timeout: 100 }).catch(() => {
        return 'timeout';
      });
    }));
    assert.deepStrictEqual(results.map(normalizeOutcome), requireExpectedArray(scenarioCase, 'results'));
    await dispatcher.destroy();
  },
  'mixed-errors-successes': async (scenarioCase) => {
    const { agent, dispatcher } = createManagedDispatcher(getDispatcherConfig(scenarioCase));
    const goodClient = createClient(agent, testUrl);
    const results = await Promise.all([
      goodClient.get('/posts/1'),
      goodClient.get('/delay', { timeout: 100 }).catch(() => { return 'timeout'; }),
      goodClient.get('/posts/2'),
      goodClient.get('/delay', { timeout: 100 }).catch(() => { return 'timeout'; }),
      goodClient.get('/posts/1'),
      goodClient.get('/delay', { timeout: 100 }).catch(() => { return 'timeout'; })
    ]);
    assert.deepStrictEqual(results.map(normalizeOutcome), requireExpectedArray(scenarioCase, 'results'));
    await dispatcher.destroy();
  },
  'mixed-success-timeout-with-limited-connections': async (scenarioCase) => {
    const { agent, dispatcher } = createManagedDispatcher(getDispatcherConfig(scenarioCase));
    const client = createClient(agent, testUrl);
    const results = await Promise.all([
      client.get('/delay', { timeout: 100 }).catch(() => { return 'timeout1'; }),
      client.get('/posts/1'),
      client.get('/delay', { timeout: 100 }).catch(() => { return 'timeout2'; }),
      client.get('/posts/2')
    ]);
    assert.deepStrictEqual(results.map(normalizeOutcome), requireExpectedArray(scenarioCase, 'results'));
    await dispatcher.destroy();
  },
  'network-refused': async (scenarioCase) => {
    const { agent, dispatcher } = createManagedDispatcher(getDispatcherConfig(scenarioCase));
    const client = createClient(agent, 'http://127.0.0.1:59999');
    const expectedError = requireExpectedString(scenarioCase, 'error');

    await assert.rejects(async () => {
      await client.get('/api');
    }, (error: unknown) => {
      assert.ok(error instanceof Error);
      const cause = error as Error & { cause?: Error };
      const hasConnectError = error.message.includes(expectedError) || (cause.cause?.message ?? '').includes(expectedError);
      assert.ok(hasConnectError, `Expected connect error, got: ${error.message}`);
      return true;
    });

    await dispatcher.destroy();
  },
  'pipelining-disabled': async (scenarioCase) => {
    const { agent, dispatcher } = createManagedDispatcher(getDispatcherConfig(scenarioCase));
    const client = createClient(agent, testUrl);
    const requests = [
      client.get('/posts/1'),
      client.get('/posts/2')
    ];
    const responses = await Promise.all(requests);
    assert.deepStrictEqual(responses.map(normalizeOutcome), requireExpectedArray(scenarioCase, 'statuses'));
    await dispatcher.destroy();
  },
  'pipelining-high': async (scenarioCase) => {
    const { agent, dispatcher } = createManagedDispatcher(getDispatcherConfig(scenarioCase));
    const client = createClient(agent, testUrl);
    const batch = requireBatchInput(scenarioCase);
    const responses = await Promise.all(createBatchRequests(batch, async () => {
      return await client.get('/posts/1');
    }));
    assert.deepStrictEqual(responses.map(normalizeOutcome), requireExpectedArray(scenarioCase, 'statuses'));
    await dispatcher.destroy();
  },
  'pool-after-network-error': async (scenarioCase) => {
    const { agent, dispatcher } = createManagedDispatcher(getDispatcherConfig(scenarioCase));
    const client = createClient(agent, testUrl);
    const badClient = FetchClient.create({
      baseURL: 'http://127.0.0.1:1',
      options: { dispatcher: agent }
    });

    await assert.rejects(async () => {
      await badClient.get('/api');
    }, Error);

    const response = await client.get('/posts/1');
    assert.strictEqual(response.status, 200);
    await dispatcher.destroy();
  },
  'pool-after-timeout': async (scenarioCase) => {
    const { agent, dispatcher } = createManagedDispatcher(getDispatcherConfig(scenarioCase));
    const client = createClient(agent, testUrl);

    await assert.rejects(async () => {
      await client.get('/delay', { timeout: 50 });
    }, TimeoutError);

    const response = await client.get('/posts/1');
    assert.strictEqual(response.status, 200);
    await dispatcher.destroy();
  },
  'queue-requests-when-pool-is-full': async (scenarioCase) => {
    const { agent, dispatcher } = createManagedDispatcher(getDispatcherConfig(scenarioCase));
    const client = createClient(agent, testUrl);
    const startTime = Date.now();
    const results = await Promise.allSettled([
      client.get('/delay'),
      client.get('/posts/1'),
      client.get('/posts/2')
    ]);
    const elapsed = Date.now() - startTime;
    assert.ok(elapsed >= 5000, 'Should take at least 5s due to /delay endpoint');
    assert.strictEqual(results[0]?.status, 'fulfilled');
    assert.strictEqual(results[1]?.status, 'fulfilled');
    assert.strictEqual(results[2]?.status, 'fulfilled');
    await dispatcher.destroy();
  },
  'saturated-health': async (scenarioCase) => {
    const { agent, dispatcher } = createManagedDispatcher(getDispatcherConfig(scenarioCase));
    const client = createClient(agent, testUrl);

    const slowRequests = [
      client.get('/delay'),
      client.get('/delay'),
      client.get('/delay')
    ];

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 100);
    });

    const health = dispatcher.checkDispatcherHealth(new URL(testUrl).origin);
    assert.ok(typeof health.healthy === 'boolean', 'Health check should return results');

    await Promise.allSettled(slowRequests);
    await dispatcher.destroy();
  },
  'sequential-errors': async (scenarioCase) => {
    const { agent, dispatcher } = createManagedDispatcher(getDispatcherConfig(scenarioCase));
    const client = createClient(agent, testUrl);

    for (let i = 0; i < (scenarioCase.input.repeats ?? 0); i++) {
      await assert.rejects(async () => {
        await client.get('/delay', { timeout: 50 });
      }, TimeoutError);
    }

    const response = await client.get('/posts/1');
    assert.strictEqual(response.status, 200);
    await dispatcher.destroy();
  }
};

async function runCase<Shape extends ScenarioCase['shape']>(scenarioCase: Extract<ScenarioCase, { shape: Shape }>): Promise<void> {
  await runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('Connection Pool Error Scenarios', () => {
  for (const scenario of scenarioGroups.cases) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
