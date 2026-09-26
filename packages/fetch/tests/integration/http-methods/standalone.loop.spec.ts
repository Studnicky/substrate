import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import { Predicates } from '@studnicky/types/node';
import { RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';
import {
  after, before, describe, it
} from 'node:test';

import { FetchClient } from '../../../src/node/index.js';
import {
  startTestServer, stopTestServer
} from '../../helpers/test-server/index.js';

import { StandaloneScenarioCaseEntity } from './entities/StandaloneScenarioCaseEntity.js';
import scenarioGroups from './standalone.scenarios.json' with { type: 'json' };

type ScenarioCase = StandaloneScenarioCaseEntity.Type;

const fileIntake = ScenarioFileCompiler.compileIntake(StandaloneScenarioCaseEntity.Schema, StandaloneScenarioCaseEntity.Node);

const client = FetchClient.create();

let testUrl: string;

function requireJsonRecord(value: unknown): { id?: number; title?: string } {
  if (!Predicates.isObject(value)) {
    throw RuntimeError.create('Expected a JSON object response body');
  }
  const id = value.id;
  const title = value.title;
  return {
    ...(typeof id === 'number' ? { id } : {}),
    ...(typeof title === 'string' ? { title } : {})
  };
}

const requestRunnerMap: Record<ScenarioCase['input']['method'], (url: string, body?: ScenarioCase['input']['body']) => Promise<Response>> = {
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

  const data = requireJsonRecord(await response.json());
  if (scenarioCase.expected.id !== undefined) {
    assert.strictEqual(data.id, scenarioCase.expected.id);
  }
  if (scenarioCase.expected.title !== undefined) {
    assert.strictEqual(data.title, scenarioCase.expected.title);
  }
}

void describe('FetchClient HTTP methods with absolute URLs', () => {
  for (const scenario of fileIntake(scenarioGroups).cases) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
