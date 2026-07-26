import assert from 'node:assert/strict';
import {
  after, before, describe, it
} from 'node:test';

import { FetchClient } from '../../../src/index.js';
import {
  startTestServer, stopTestServer
} from '../../helpers/test-server/index.js';

type ScenarioCase = {
  description: string;
  expected:
    | { shape: 'ok'; status: number; text?: string }
    | { id?: number; shape: 'json'; status: number; title?: string };
  name: string;
  input: {
    body?: Record<string, unknown> | string;
    method: 'DELETE' | 'GET' | 'HEAD' | 'OPTIONS' | 'PATCH' | 'POST' | 'PUT';
    path: string;
  };
};

import scenarioGroups from './standalone.scenarios.json' with { type: 'json' };

const client = FetchClient.create();

let testUrl: string;

const requestRunnerMap: Record<ScenarioCase['input']['method'], (url: string, body?: Record<string, unknown> | string) => Promise<Response>> = {
  'DELETE': async (url) => client.delete(url),
  'GET': async (url) => client.get(url),
  'HEAD': async (url) => client.head(url),
  'OPTIONS': async (url) => client.options(url),
  'PATCH': async (url, body) => client.patch(url, body === undefined ? undefined : { body }),
  'POST': async (url, body) => client.post(url, body === undefined ? undefined : { body }),
  'PUT': async (url, body) => client.put(url, body === undefined ? undefined : { body })
};

void before(async () => {
  testUrl = await startTestServer();
});

void after(async () => {
  await stopTestServer();
});

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  const url = `${testUrl}${scenarioCase.input.path}`;
  const response = await requestRunnerMap[scenarioCase.input.method](url, scenarioCase.input.body);

  assert.strictEqual(response.status, scenarioCase.expected.status);

  if (scenarioCase.expected.shape === 'ok') {
    if (scenarioCase.expected.text !== undefined) {
      assert.strictEqual(await response.text(), scenarioCase.expected.text);
    }
    return;
  }

  const data = await response.json() as { id?: number; title?: string };
  if (scenarioCase.expected.id !== undefined) {
    assert.strictEqual(data.id, scenarioCase.expected.id);
  }
  if (scenarioCase.expected.title !== undefined) {
    assert.strictEqual(data.title, scenarioCase.expected.title);
  }
}

void describe('FetchClient HTTP methods with absolute URLs', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
