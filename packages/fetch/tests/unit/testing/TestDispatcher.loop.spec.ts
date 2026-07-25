import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { TestDispatcher } from '../../../src/testing/TestDispatcher.js';
import scenarioGroups from './TestDispatcher.scenarios.json';

type ScenarioCase = {
  description: string;
  expected: {
    body?: Record<string, unknown> | readonly unknown[] | string;
    errorCode?: string;
    errorMessage?: string;
    headers?: Record<string, string>;
    longStatus?: number;
    origin: string;
    queuedErrorMessage?: string;
    queuedErrorName?: string;
    stats?: {
      connected: number;
      free: number;
      pending: number;
      queued: number;
      running: number;
      size: number;
    };
    status?: number;
  };
  input: {
    abortAfterMs?: number;
    body?: string;
    bodyBuffer?: number[];
    init?: Record<string, unknown>;
    longUrl?: string;
    queuedUrl?: string;
    testDispatcher: {
      connections: number;
      enabled: boolean;
    };
    url: string;
  };
  kind: ScenarioKind;
  name: string;
};

type BodyScenarioKind =
  | 'post-arraybuffer'
  | 'post-dataview'
  | 'post-string'
  | 'post-uint8array';

type ScenarioKind =
  | BodyScenarioKind
  | 'delete-post'
  | 'enotfound'
  | 'enetunreach'
  | 'invalid-protocol'
  | 'head-post'
  | 'not-found'
  | 'ok'
  | 'patch-post'
  | 'post-blob'
  | 'post-echo'
  | 'post-posts'
  | 'put-post'
  | 'queued-request-aborts-before-dispatch'
  | 'signal-aborted-before-wait'
  | 'text-response'
  | 'url-echo';

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

const requestBodyMap: Record<BodyScenarioKind, (scenarioCase: ScenarioCase) => unknown> = {
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

async function runQueuedAbortCase(scenarioCase: ScenarioCase): Promise<void> {
  const dispatcher = createDispatcher(scenarioCase);

  try {
    const longRequest = dispatcher.fetch(scenarioCase.input.longUrl, {});
    const controller = new AbortController();
    const queuedRequest = dispatcher.fetch(scenarioCase.input.queuedUrl, { signal: controller.signal });
    const queuedAssertion = assert.rejects(queuedRequest, (error: unknown) => {
      assert.ok(error instanceof DOMException);
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
    assert.ok(scenarioCase.expected.origin in stats);
    assert.deepStrictEqual(
      stats[scenarioCase.expected.origin],
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
      dispatcher.fetch(scenarioCase.input.url, { signal: controller.signal }),
      (error: unknown) => {
        assert.ok(error instanceof DOMException);
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
      dispatcher.fetch(scenarioCase.input.url, {}),
      (error: unknown) => {
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
    const response = await dispatcher.fetch(scenarioCase.input.url, {});
    assert.strictEqual(response.status, scenarioCase.expected.status);
    const body = await response.text();
    assert.strictEqual(body, scenarioCase.expected.body);
  });
}

async function runJsonRouteCase(scenarioCase: ScenarioCase): Promise<void> {
  await withDispatcher(scenarioCase, async (dispatcher) => {
    const response = await dispatcher.fetch(scenarioCase.input.url, scenarioCase.input.init ?? {});
    assert.strictEqual(response.status, scenarioCase.expected.status);
    const json = await response.json();
    assert.deepStrictEqual(json, scenarioCase.expected.body);
  });
}

async function runHeadRouteCase(scenarioCase: ScenarioCase): Promise<void> {
  await withDispatcher(scenarioCase, async (dispatcher) => {
    const response = await dispatcher.fetch(scenarioCase.input.url, scenarioCase.input.init ?? {});
    assert.strictEqual(response.status, scenarioCase.expected.status);
    assert.strictEqual(await response.text(), '');
  });
}

async function runBodyEchoCase(scenarioCase: ScenarioCase, bodyKind: BodyScenarioKind): Promise<void> {
  await withDispatcher(scenarioCase, async (dispatcher) => {
    const init = { ...scenarioCase.input.init };
    init.body = requestBodyMap[bodyKind](scenarioCase);

    const response = await dispatcher.fetch(scenarioCase.input.url, init);
    assert.strictEqual(response.status, scenarioCase.expected.status);
    const json = await response.json();
    assert.deepStrictEqual(json, scenarioCase.expected.body);
  });
}

async function runBlobCase(scenarioCase: ScenarioCase): Promise<void> {
  await withDispatcher(scenarioCase, async (dispatcher) => {
    const init = { ...scenarioCase.input.init, 'body': new Blob([scenarioCase.input.body ?? '']) };
    await assert.rejects(
      dispatcher.fetch(scenarioCase.input.url, init),
      (error: unknown) => error instanceof TypeError && error.message === scenarioCase.expected.errorMessage
    );
  });
}

const runnerMap: Record<ScenarioKind, ScenarioRunner> = {
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
  await runnerMap[scenarioCase.kind](scenarioCase);
}

void describe('fetch test dispatcher', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
