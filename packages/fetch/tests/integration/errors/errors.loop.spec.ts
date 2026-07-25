import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { AbortError, FetchClient, TimeoutError } from '../../../src/index.js';
import { startTestServer, stopTestServer } from '../../helpers/test-server/index.js';
import scenarioGroups from './errors.scenarios.json';

type ScenarioCase =
  | {
      description: string;
      expected: { error: 'AbortError' | 'Error' | 'TimeoutError'; messageIncludes?: readonly string[]; timeoutMs?: number; urlIncludes?: string };
      input: { signal?: 'abort-after-ms'; timeout?: number; url: string };
      name: string;
    }
  | {
      description: string;
      expected: { ok: boolean; status: number };
      input: { timeout?: number; url: string };
      name: string;
    };

const client = FetchClient.create();

let testUrl: string;

void before(async () => {
  testUrl = await startTestServer();
});

void after(async () => {
  await stopTestServer();
});

function materializeSignal(flag: ScenarioCase['input'] extends { signal?: infer T } ? T : never): AbortSignal | undefined {
  if (flag === undefined) {
    return undefined;
  }

  if (flag === 'abort-after-ms') {
    const controller = new AbortController();
    setTimeout(() => {
      controller.abort();
    }, 10);
    return controller.signal;
  }

  return undefined;
}

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  const request = scenarioCase.input;
  const url = request.url.startsWith('http') ? request.url : `${testUrl}${request.url}`;
  const signal = 'signal' in request ? materializeSignal(request.signal) : undefined;
  const options = {
    ...(request.timeout === undefined ? {} : { timeout: request.timeout }),
    ...(signal === undefined ? {} : { signal })
  };

  if ('error' in scenarioCase.expected) {
    await assert.rejects(async () => {
      await client.get(url, options);
    }, (error: Error) => {
      if (scenarioCase.expected.error === 'TimeoutError') {
        assert.ok(error instanceof TimeoutError);
        if (scenarioCase.expected.timeoutMs !== undefined && error instanceof TimeoutError) {
          assert.strictEqual(error.timeoutMs, scenarioCase.expected.timeoutMs);
        }
      } else if (scenarioCase.expected.error === 'AbortError') {
        assert.ok(error instanceof AbortError);
      } else {
        assert.ok(error instanceof Error);
      }

      if (scenarioCase.expected.messageIncludes !== undefined) {
        for (const expectedMessagePart of scenarioCase.expected.messageIncludes) {
          assert.ok(error.message.includes(expectedMessagePart));
        }
      }

      if (scenarioCase.expected.urlIncludes !== undefined) {
        assert.ok(error.message.includes(scenarioCase.expected.urlIncludes) || ('url' in error && typeof error.url === 'string' && error.url.includes(scenarioCase.expected.urlIncludes)));
      }

      return true;
    });
    return;
  }

  const response = await client.get(url, options);
  assert.strictEqual(response.status, scenarioCase.expected.status);
  assert.strictEqual(response.ok, scenarioCase.expected.ok);
}

void describe('Error Handling', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
