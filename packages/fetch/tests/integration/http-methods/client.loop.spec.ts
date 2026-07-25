import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { FetchClient } from '../../../src/index.js';
import { startTestServer, stopTestServer } from '../../helpers/test-server/index.js';
import scenarioGroups from './client.scenarios.json';

type ScenarioCase =
  | {
      description: string;
      expected: { json?: { [key: string]: unknown }; status: number };
      input: {
        body?: Record<string, unknown> | string;
        method: 'DELETE' | 'GET' | 'HEAD' | 'OPTIONS' | 'PATCH' | 'POST' | 'PUT';
        path: string;
      };
      name: string;
    };

type RequestMethod = ScenarioCase['input']['method'];
type MethodRunner = (request: ScenarioCase['input']) => Promise<Response>;

const ctx = {
  client: undefined as unknown as FetchClient,
  testUrl: ''
};

void before(async () => {
  ctx.testUrl = await startTestServer();
  ctx.client = FetchClient.create({ baseURL: ctx.testUrl });
});

void after(async () => {
  await stopTestServer();
});

function requestBodyOptions(request: ScenarioCase['input']): { body: Record<string, unknown> | string } | undefined {
  return request.body === undefined ? undefined : { body: request.body };
}

const methodRunnerMap: Record<RequestMethod, MethodRunner> = {
  DELETE: async (request) => ctx.client.delete(request.path),
  GET: async (request) => ctx.client.get(request.path),
  HEAD: async (request) => ctx.client.head(request.path),
  OPTIONS: async (request) => ctx.client.options(request.path),
  PATCH: async (request) => ctx.client.patch(request.path, requestBodyOptions(request)),
  POST: async (request) => ctx.client.post(request.path, requestBodyOptions(request)),
  PUT: async (request) => ctx.client.put(request.path, requestBodyOptions(request))
};

async function assertResponse(response: Response, expected: ScenarioCase['expected']): Promise<void> {
  assert.strictEqual(response.status, expected.status);

  if (expected.json !== undefined) {
    assert.deepStrictEqual(await response.json(), expected.json);
  }
}

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  const response = await methodRunnerMap[scenarioCase.input.method](scenarioCase.input);
  await assertResponse(response, scenarioCase.expected);
}

void describe('FetchClient HTTP Methods', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
