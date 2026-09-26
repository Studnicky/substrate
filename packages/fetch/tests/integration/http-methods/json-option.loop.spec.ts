import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import { RuntimeError } from '@studnicky/errors/node';
import { Predicates } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { FetchClient } from '../../../src/node/index.js';
import { startTestServer, stopTestServer } from '../../helpers/test-server/index.js';

import { JsonOptionScenarioCaseEntity } from './entities/JsonOptionScenarioCaseEntity.js';
import scenarioGroups from './json-option.scenarios.json' with { type: 'json' };

type ScenarioCase = JsonOptionScenarioCaseEntity.Type;

const fileIntake = ScenarioFileCompiler.compileIntake(JsonOptionScenarioCaseEntity.Schema, JsonOptionScenarioCaseEntity.Node);

function requireResponseBody(value: unknown): { body: unknown; headers: Record<string, string> } {
  if (!Predicates.isObject(value) || !('body' in value) || !('headers' in value) || !Predicates.isObject(value.headers)) {
    throw RuntimeError.create('Expected an echo response with body/headers');
  }
  const headers: Record<string, string> = {};
  for (const [key, headerValue] of Object.entries(value.headers)) {
    headers[key] = String(headerValue);
  }
  return { 'body': value.body, headers };
}

const ctx: {
  absoluteClient: FetchClient | undefined;
  baseClient: FetchClient | undefined;
  testUrl: string;
} = {
  absoluteClient: undefined,
  baseClient: undefined,
  testUrl: ''
};

/** Both clients are built in `before()`; reading one earlier is a suite-ordering defect. */
function requireClient(client: FetchClient | undefined, label: string): FetchClient {
  if (client === undefined) {
    throw RuntimeError.create(`${label} is unavailable because before() has not run`);
  }

  return client;
}

void before(async () => {
  ctx.testUrl = await startTestServer();
  ctx.baseClient = FetchClient.create({ baseURL: ctx.testUrl });
  ctx.absoluteClient = FetchClient.create();
});

void after(async () => {
  await stopTestServer();
});

function resolveBaseURL(baseURL: string): string {
  return baseURL === '__TEST_SERVER_URL__' ? ctx.testUrl : baseURL;
}

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  const client = scenarioCase.client === 'absolute'
    ? requireClient(ctx.absoluteClient, 'absoluteClient')
    : requireClient(ctx.baseClient, 'baseClient');
  const request = scenarioCase.input;
  const url = scenarioCase.client === 'absolute' ? `${resolveBaseURL(request.baseURL)}${request.path}` : request.path;

  const options = {
    ...(request.body === undefined ? {} : { body: request.body }),
    ...(request.json === undefined ? {} : { json: request.json })
  };

  const response = request.method === 'POST'
    ? await client.post(url, options)
    : request.method === 'PUT'
      ? await client.put(url, options)
      : await client.patch(url, options);

  assert.strictEqual(response.status, scenarioCase.expected.status);

  if ('body' in scenarioCase.expected) {
    const data = requireResponseBody(await response.json());
    assert.deepStrictEqual(data.body, scenarioCase.expected.body);
    if (scenarioCase.expected.headerContentType !== undefined) {
      assert.strictEqual(data.headers['content-type'], scenarioCase.expected.headerContentType);
    }
    return;
  }

  assert.deepStrictEqual(await response.json(), scenarioCase.expected.json);
}

void describe('json option', () => {
  for (const scenario of fileIntake(scenarioGroups).cases) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
