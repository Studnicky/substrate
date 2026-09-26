import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import { RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';

import { FetchTransport } from '../../src/modules/FetchTransport.js';

import { FetchTransportScenarioCaseEntity } from './entities/FetchTransportScenarioCaseEntity.js';
import scenarioGroups from './FetchTransport.scenarios.json' with { type: 'json' };

type ScenarioCase = FetchTransportScenarioCaseEntity.Type;
type FetchExpected = Extract<ScenarioCase['expected'], { init: unknown }>;
type UndiciExpected = Extract<ScenarioCase['expected'], { responseBody: unknown }>;

const fileIntake = ScenarioFileCompiler.compileIntake(FetchTransportScenarioCaseEntity.Schema, FetchTransportScenarioCaseEntity.Node);

function requireFetchExpected(expected: ScenarioCase['expected']): FetchExpected {
  if (!('init' in expected)) {
    throw RuntimeError.create('Expected a fetch-transport scenario with init/input');
  }
  return expected;
}

function requireUndiciExpected(expected: ScenarioCase['expected']): UndiciExpected {
  if (!('responseBody' in expected)) {
    throw RuntimeError.create('Expected an undici-transport scenario with responseBody');
  }
  return expected;
}

const originalFetch = globalThis.fetch;

void after(() => {
  globalThis.fetch = originalFetch;
});

function createTestTransportResponse(input: string, init: Record<string, unknown>): Response {
  return new Response(JSON.stringify({ input, method: init.method }), {
    'headers': { 'Content-Type': 'application/json' },
    'status': 200
  });
}

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  if (scenarioCase.operation === 'uses-native-fetch') {
    const expected = requireFetchExpected(scenarioCase.expected);
    const expectedResponse = new Response('native response');
    let receivedUrl = '';
    let receivedInit: RequestInit | undefined;

    globalThis.fetch = async (input, init): Promise<Response> => {
      receivedUrl = String(input);
      receivedInit = init;
      return expectedResponse;
    };

    const response = await FetchTransport.fetch(expected.input, expected.init);
    assert.equal(response, expectedResponse);
    assert.equal(receivedUrl, expected.input);
    assert.deepEqual(receivedInit, expected.init);
    return;
  }

  if (scenarioCase.operation === 'uses-test-transport') {
    const expected = requireFetchExpected(scenarioCase.expected);
    const testTransport = {
      '__substrateFetchTransport': true,
      fetch: async (input: string, init: Record<string, unknown>): Promise<Response> => {
        return createTestTransportResponse(input, init);
      }
    };

    const response = await FetchTransport.fetch(expected.input, {
      'dispatcher': testTransport,
      ...expected.init
    });

    assert.strictEqual(response.status, 200);
    assert.equal(await response.text(), JSON.stringify({ input: expected.input, method: expected.init.method }));
    return;
  }

  const expected = requireUndiciExpected(scenarioCase.expected);
  const dispatcher = scenarioCase.operation === 'uses-undici-fetch-null-dispatcher' ? null : {};
  const response = await FetchTransport.fetch(`data:text/plain,${encodeURIComponent(expected.responseBody)}`, { 'dispatcher': dispatcher });
  assert.equal(await response.text(), expected.responseBody);
}

void describe('node fetch transport', () => {
  for (const scenario of fileIntake(scenarioGroups).cases) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
