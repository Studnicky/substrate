import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';

import { FetchTransport } from '../../src/modules/FetchTransport.js';
import scenarioGroups from './FetchTransport.scenarios.json' with { type: 'json' };

type ScenarioCase =
  | {
      description: string;
      expected: { input: string; init: Record<string, unknown> };
      input: Record<string, never>;
      name: string;
      operation: 'uses-native-fetch';
    }
  | {
      description: string;
      expected: { input: string; init: Record<string, unknown> };
      input: Record<string, never>;
      name: string;
      operation: 'uses-test-transport';
    }
  | {
      description: string;
      expected: { responseBody: string };
      input: Record<string, never>;
      name: string;
      operation: 'uses-undici-fetch';
    }
  | {
      description: string;
      expected: { responseBody: string };
      input: Record<string, never>;
      name: string;
      operation: 'uses-undici-fetch-null-dispatcher';
    };

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
    const expectedResponse = new Response('native response');
    let receivedUrl = '';
    let receivedInit: RequestInit | undefined;

    globalThis.fetch = async (input, init): Promise<Response> => {
      receivedUrl = String(input);
      receivedInit = init;
      return expectedResponse;
    };

    const response = await FetchTransport.fetch(scenarioCase.expected.input, scenarioCase.expected.init);
    assert.equal(response, expectedResponse);
    assert.equal(receivedUrl, scenarioCase.expected.input);
    assert.deepEqual(receivedInit, scenarioCase.expected.init);
    return;
  }

  if (scenarioCase.operation === 'uses-test-transport') {
    const testTransport = {
      '__substrateFetchTransport': true,
      fetch: async (input: string, init: Record<string, unknown>): Promise<Response> => {
        return createTestTransportResponse(input, init);
      }
    };

    const response = await FetchTransport.fetch(scenarioCase.expected.input, {
      'dispatcher': testTransport,
      ...scenarioCase.expected.init
    });

    assert.strictEqual(response.status, 200);
    assert.equal(await response.text(), JSON.stringify({ input: scenarioCase.expected.input, method: scenarioCase.expected.init.method }));
    return;
  }

  const dispatcher = scenarioCase.operation === 'uses-undici-fetch-null-dispatcher' ? null : {};
  const response = await FetchTransport.fetch(`data:text/plain,${encodeURIComponent(scenarioCase.expected.responseBody)}`, { 'dispatcher': dispatcher });
  assert.equal(await response.text(), scenarioCase.expected.responseBody);
}

void describe('node fetch transport', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
