import { RuntimeError } from '@studnicky/errors';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { FetchClient } from '../../../src/node/index.js';
import { startTestServer, stopTestServer } from '../../helpers/test-server/index.js';
import scenarioGroups from './client.scenarios.json' with { type: 'json' };

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

const ctx: { client: FetchClient | undefined; testUrl: string } = {
  client: undefined,
  testUrl: ''
};

/** The client is built in `before()`; reading it earlier is a suite-ordering defect. */
function requireClient(): FetchClient {
  if (ctx.client === undefined) {
    throw RuntimeError.create('client is unavailable because before() has not run');
  }

  return ctx.client;
}

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
  DELETE: async (request) => requireClient().delete(request.path),
  GET: async (request) => requireClient().get(request.path),
  HEAD: async (request) => requireClient().head(request.path),
  OPTIONS: async (request) => requireClient().options(request.path),
  PATCH: async (request) => requireClient().patch(request.path, requestBodyOptions(request)),
  POST: async (request) => requireClient().post(request.path, requestBodyOptions(request)),
  PUT: async (request) => requireClient().put(request.path, requestBodyOptions(request))
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
