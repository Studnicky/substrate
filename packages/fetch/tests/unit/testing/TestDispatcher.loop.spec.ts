import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import { RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { ConfigurationError } from '../../../src/errors/ConfigurationError.js';
import { FetchBaseError } from '../../../src/errors/FetchBaseError.js';
import { TestDispatcher } from '../../../src/testing/TestDispatcher.js';

import { TestDispatcherScenarioCaseEntity } from './entities/TestDispatcherScenarioCaseEntity.js';
import scenarioGroups from './TestDispatcher.scenarios.json' with { type: 'json' };

type ScenarioCase = TestDispatcherScenarioCaseEntity.Type;
type BodyScenarioShape = 'post-arraybuffer' | 'post-dataview' | 'post-string' | 'post-uint8array';

const fileIntake = ScenarioFileCompiler.compileIntake(TestDispatcherScenarioCaseEntity.Schema, TestDispatcherScenarioCaseEntity.Node);

type ScenarioRunner = (scenarioCase: ScenarioCase) => Promise<void>;

function createDispatcher(scenarioCase: ScenarioCase): TestDispatcher {
  return TestDispatcher.create(scenarioCase.input.testDispatcher);
}

async function withDispatcher(scenarioCase: ScenarioCase, runner: (dispatcher: TestDispatcher) => Promise<void>): Promise<void> {
  const dispatcher = createDispatcher(scenarioCase);

  try {
    await runner(dispatcher);
  } finally {
    await dispatcher.destroy();
  }
}

const requestBodyMap: Record<BodyScenarioShape, (scenarioCase: ScenarioCase) => unknown> = {
  'post-arraybuffer': (scenarioCase) => {
    return new Uint8Array(scenarioCase.input.bodyBuffer ?? []).buffer;
  },
  'post-dataview': (scenarioCase) => {
    const bytes = new Uint8Array(scenarioCase.input.bodyBuffer ?? []);
    return new DataView(bytes.buffer);
  },
  'post-string': (scenarioCase) => {
    return scenarioCase.input.body ?? '';
  },
  'post-uint8array': (scenarioCase) => {
    return new Uint8Array(scenarioCase.input.bodyBuffer ?? []);
  }
};

function requireUrl(value: string | undefined, label: string): string {
  if (value === undefined) {
    throw RuntimeError.create(`${label} is required for this scenario`);
  }

  return value;
}

async function runQueuedAbortCase(scenarioCase: ScenarioCase): Promise<void> {
  const dispatcher = createDispatcher(scenarioCase);

  try {
    const longRequest = dispatcher.fetch(requireUrl(scenarioCase.input.longUrl, 'input.longUrl'), {});
    const controller = new AbortController();
    const queuedRequest = dispatcher.fetch(requireUrl(scenarioCase.input.queuedUrl, 'input.queuedUrl'), { signal: controller.signal });
    const queuedAssertion = assert.rejects(queuedRequest, (error) => {
      assert.ok(error instanceof FetchBaseError);
      assert.strictEqual(error.name, scenarioCase.expected.queuedErrorName);
      assert.strictEqual(error.message, scenarioCase.expected.queuedErrorMessage);
      return true;
    });

    setTimeout(() => {
      controller.abort();
    }, scenarioCase.input.abortAfterMs);

    const longResponse = await longRequest;
    assert.strictEqual(longResponse.status, scenarioCase.expected.longStatus);
    await queuedAssertion;

    const stats = dispatcher.getStats();
    assert.ok(stats.has(scenarioCase.expected.origin));
    assert.deepStrictEqual(
      stats.get(scenarioCase.expected.origin),
      scenarioCase.expected.stats
    );
  } finally {
    await dispatcher.destroy();
  }
}

async function runSignalAbortedCase(scenarioCase: ScenarioCase): Promise<void> {
  await withDispatcher(scenarioCase, async (dispatcher) => {
    const controller = new AbortController();
    controller.abort();

    await assert.rejects(
      dispatcher.fetch(requireUrl(scenarioCase.input.url, 'input.url'), { signal: controller.signal }),
      (error) => {
        assert.ok(error instanceof FetchBaseError);
        assert.strictEqual(error.name, scenarioCase.expected.queuedErrorName);
        assert.strictEqual(error.message, scenarioCase.expected.queuedErrorMessage);
        return true;
      }
    );
  });
}

async function runNetworkErrorCase(scenarioCase: ScenarioCase): Promise<void> {
  await withDispatcher(scenarioCase, async (dispatcher) => {
    await assert.rejects(
      dispatcher.fetch(requireUrl(scenarioCase.input.url, 'input.url'), {}),
      (error) => {
        assert.ok(error instanceof Error);
        assert.strictEqual(Reflect.get(error, 'code'), scenarioCase.expected.errorCode);
        assert.strictEqual(error.message, scenarioCase.expected.errorMessage);
        return true;
      }
    );
  });
}

async function runTextCase(scenarioCase: ScenarioCase): Promise<void> {
  await withDispatcher(scenarioCase, async (dispatcher) => {
    const response = await dispatcher.fetch(requireUrl(scenarioCase.input.url, 'input.url'), {});
    assert.strictEqual(response.status, scenarioCase.expected.status);
    const body = await response.text();
    assert.strictEqual(body, scenarioCase.expected.body);
  });
}

async function runJsonRouteCase(scenarioCase: ScenarioCase): Promise<void> {
  await withDispatcher(scenarioCase, async (dispatcher) => {
    const response = await dispatcher.fetch(requireUrl(scenarioCase.input.url, 'input.url'), scenarioCase.input.init ?? {});
    assert.strictEqual(response.status, scenarioCase.expected.status);
    const json = await response.json();
    assert.deepStrictEqual(json, scenarioCase.expected.body);
  });
}

async function runHeadRouteCase(scenarioCase: ScenarioCase): Promise<void> {
  await withDispatcher(scenarioCase, async (dispatcher) => {
    const response = await dispatcher.fetch(requireUrl(scenarioCase.input.url, 'input.url'), scenarioCase.input.init ?? {});
    assert.strictEqual(response.status, scenarioCase.expected.status);
    assert.strictEqual(await response.text(), '');
  });
}

async function runBodyEchoCase(scenarioCase: ScenarioCase, bodyShape: BodyScenarioShape): Promise<void> {
  await withDispatcher(scenarioCase, async (dispatcher) => {
    const init: Record<string, unknown> = { ...scenarioCase.input.init };
    init.body = requestBodyMap[bodyShape](scenarioCase);

    const response = await dispatcher.fetch(requireUrl(scenarioCase.input.url, 'input.url'), init);
    assert.strictEqual(response.status, scenarioCase.expected.status);
    const json = await response.json();
    assert.deepStrictEqual(json, scenarioCase.expected.body);
  });
}

async function runBlobCase(scenarioCase: ScenarioCase): Promise<void> {
  await withDispatcher(scenarioCase, async (dispatcher) => {
    const init = { ...scenarioCase.input.init, 'body': new Blob([scenarioCase.input.body ?? '']) };
    await assert.rejects(
      dispatcher.fetch(requireUrl(scenarioCase.input.url, 'input.url'), init),
      (error) => {
        assert.ok(error instanceof ConfigurationError);
        assert.strictEqual(error.code, scenarioCase.expected.errorCode);
        assert.strictEqual(error.message, scenarioCase.expected.errorMessage);
        return true;
      }
    );
  });
}

const runnerMap: Record<ScenarioCase['shape'], ScenarioRunner> = {
  'delete-post': runJsonRouteCase,
  'enotfound': runNetworkErrorCase,
  'enetunreach': runNetworkErrorCase,
  'head-post': runHeadRouteCase,
  'invalid-protocol': runNetworkErrorCase,
  'not-found': runJsonRouteCase,
  'ok': runTextCase,
  'patch-post': runJsonRouteCase,
  'post-arraybuffer': async (scenarioCase) => {
    await runBodyEchoCase(scenarioCase, 'post-arraybuffer');
  },
  'post-blob': runBlobCase,
  'post-dataview': async (scenarioCase) => {
    await runBodyEchoCase(scenarioCase, 'post-dataview');
  },
  'post-echo': runJsonRouteCase,
  'post-posts': runJsonRouteCase,
  'post-string': async (scenarioCase) => {
    await runBodyEchoCase(scenarioCase, 'post-string');
  },
  'post-uint8array': async (scenarioCase) => {
    await runBodyEchoCase(scenarioCase, 'post-uint8array');
  },
  'put-post': runJsonRouteCase,
  'queued-request-aborts-before-dispatch': runQueuedAbortCase,
  'signal-aborted-before-wait': runSignalAbortedCase,
  'text-response': runTextCase,
  'url-echo': runJsonRouteCase
};

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  await runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('fetch test dispatcher', () => {
  for (const scenario of fileIntake(scenarioGroups).cases) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
