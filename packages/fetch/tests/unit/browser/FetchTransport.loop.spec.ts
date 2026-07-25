import assert from 'node:assert/strict';
import {
  afterEach, describe, it
} from 'node:test';

import { DispatcherAgent as BrowserDispatcherAgent } from '../../../src/config/browser/DispatcherAgent.js';
import { ConfigurationError } from '../../../src/errors/index.js';
import { FetchTransport } from '../../../src/modules/browser/FetchTransport.js';
import { UndiciDispatcher as BrowserUndiciDispatcher } from '../../../src/modules/browser/UndiciDispatcher.js';
import scenarioGroups from './FetchTransport.scenarios.json';

type ScenarioCase =
  | { description: string; expected: { message: string }; input: Record<string, never>; name: string; operation: 'browser-dispatcher-create' }
  | { description: string; expected: { message: string }; input: Record<string, never>; name: string; operation: 'browser-agent-create' }
  | { description: string; expected: { input: string; init: Record<string, unknown> }; input: Record<string, never>; name: string; operation: 'uses-native-fetch' }
  | { description: string; expected: { message: string }; input: Record<string, never>; name: string; operation: 'rejects-node-dispatcher' }
  | { description: string; expected: { message: string }; input: Record<string, never>; name: string; operation: 'browser-dispatcher-methods' }
  | { description: string; expected: { mappings: readonly { from: string; to: string }[] }; input: Record<string, never>; name: string; operation: 'docs-graph' };

const originalFetch = globalThis.fetch;

void afterEach(() => {
  globalThis.fetch = originalFetch;
});

function sourceModuleUrl(qualifiedPath: string): string {
  const sourcePath = qualifiedPath.replace(/^packages\/fetch\//, '');
  return new URL(`../../../${sourcePath}.js`, import.meta.url).href;
}

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  if (scenarioCase.operation === 'browser-dispatcher-create') {
    assert.equal(scenarioCase.input.message, scenarioCase.expected.message);
    assert.throws(
      () => { BrowserUndiciDispatcher.create({}); },
      (error: unknown): boolean => {
        return error instanceof ConfigurationError && error.message === scenarioCase.expected.message;
      }
    );
    return;
  }

  if (scenarioCase.operation === 'browser-agent-create') {
    assert.equal(scenarioCase.input.message, scenarioCase.expected.message);
    assert.throws(
      () => { BrowserDispatcherAgent.create({} as never); },
      (error: unknown): boolean => {
        return error instanceof ConfigurationError && error.message === scenarioCase.expected.message;
      }
    );
    return;
  }

  if (scenarioCase.operation === 'uses-native-fetch') {
    assert.equal(scenarioCase.input.input, scenarioCase.expected.input);
    assert.deepEqual(scenarioCase.input.init, scenarioCase.expected.init);
    const expectedResponse = new Response('browser response');
    let receivedUrl = '';
    let receivedInit: RequestInit | undefined;

    globalThis.fetch = async (input, init): Promise<Response> => {
      receivedUrl = String(input);
      receivedInit = init;
      return expectedResponse;
    };

    return FetchTransport.fetch(scenarioCase.expected.input, { method: 'GET' }).then((response) => {
      assert.equal(response, expectedResponse);
      assert.equal(receivedUrl, scenarioCase.expected.input);
      assert.deepEqual(receivedInit, scenarioCase.expected.init);
    });
  }

  if (scenarioCase.operation === 'rejects-node-dispatcher') {
    assert.equal(scenarioCase.input.message, scenarioCase.expected.message);
    let fetchCalled = false;

    globalThis.fetch = async (): Promise<Response> => {
      fetchCalled = true;
      return new Response();
    };

    return assert.rejects(
      FetchTransport.fetch('https://example.com/resource', { dispatcher: {} }),
      (error: unknown): boolean => {
        return error instanceof ConfigurationError && error.message === scenarioCase.expected.message;
      }
    ).then(() => {
      assert.equal(fetchCalled, false);
    });
  }

  if (scenarioCase.operation === 'browser-dispatcher-methods') {
    const browserDispatcher = Object.create(BrowserUndiciDispatcher.prototype) as InstanceType<typeof BrowserUndiciDispatcher>;

    assert.throws(() => {
      browserDispatcher.checkDispatcherHealth('https://example.com');
    }, (error: unknown): boolean => {
      return error instanceof ConfigurationError && error.message === scenarioCase.expected.message;
    });

    assert.throws(() => {
      browserDispatcher.close();
    }, (error: unknown): boolean => {
      return error instanceof ConfigurationError && error.message === scenarioCase.expected.message;
    });

    assert.throws(() => {
      browserDispatcher.destroy();
    }, (error: unknown): boolean => {
      return error instanceof ConfigurationError && error.message === scenarioCase.expected.message;
    });

    assert.throws(() => {
      browserDispatcher.getStats();
    }, (error: unknown): boolean => {
      return error instanceof ConfigurationError && error.message === scenarioCase.expected.message;
    });
    return;
  }

  assert.equal(scenarioCase.input.mappings.length, scenarioCase.expected.mappings.length);
  assert.equal(scenarioCase.expected.mappings.length, 3);

  for (let index = 0; index < scenarioCase.input.mappings.length; index += 1) {
    const mapping = scenarioCase.input.mappings[index];
    assert.deepEqual(mapping, scenarioCase.expected.mappings[index]);
    assert.ok(mapping.from.startsWith('packages/fetch/src/'));
    assert.ok(mapping.to.startsWith('packages/fetch/src/'));
    await import(sourceModuleUrl(mapping.to));
  }
}

void describe('browser fetch transport', () => {
  for (const scenario of scenarioGroups.cases) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
