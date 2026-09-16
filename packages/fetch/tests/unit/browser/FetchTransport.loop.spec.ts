import assert from 'node:assert/strict';
import {
  afterEach, describe, it
} from 'node:test';

import { ConfigurationError } from '../../../src/errors/index.js';
import type { FetchClientInterface } from '../../../src/interfaces/FetchClientInterface.js';
import { BrowserFetchClient, FetchTransport } from '../../../src/browser/index.js';
import scenarioGroups from './FetchTransport.scenarios.json' with { type: 'json' };

interface ScenarioCase {
  readonly 'description': string;
  readonly 'expected': {
    readonly 'init'?: Record<string, unknown>;
    readonly 'input'?: string;
    readonly 'message'?: string;
  };
  readonly 'input': {
    readonly 'init'?: Record<string, unknown>;
    readonly 'input'?: string;
    readonly 'message'?: string;
  };
  readonly 'name': string;
  readonly 'operation': string;
}

const originalFetch = globalThis.fetch;

void afterEach(() => {
  globalThis.fetch = originalFetch;
});

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  if (scenarioCase.operation === 'uses-native-fetch') {
    const expectedInput = scenarioCase.expected.input;
    const expectedInit = scenarioCase.expected.init;
    if (expectedInput === undefined || expectedInit === undefined) {
      throw new Error('uses-native-fetch scenario requires expected input and init');
    }
    const expectedResponse = new Response('browser response');
    let receivedUrl = '';
    let receivedInit: RequestInit | undefined;
    globalThis.fetch = async (input, init): Promise<Response> => {
      receivedUrl = String(input);
      receivedInit = init;
      return expectedResponse;
    };

    const response = await FetchTransport.fetch(expectedInput, { 'method': 'GET' });

    assert.equal(response, expectedResponse);
    assert.equal(receivedUrl, expectedInput);
    assert.deepEqual(receivedInit, expectedInit);
    return;
  }

  let fetchCalled = false;
  globalThis.fetch = async (): Promise<Response> => {
    fetchCalled = true;
    return new Response();
  };

  await assert.rejects(
    FetchTransport.fetch('https://example.com/resource', { 'dispatcher': {} }),
    (error): boolean => error instanceof ConfigurationError && error.message === scenarioCase.expected.message
  );
  assert.equal(fetchCalled, false);
}

void describe('browser fetch transport', () => {
  for (const scenario of scenarioGroups.cases) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }

  void it('satisfies the shared client contract through native fetch', async () => {
    const client: FetchClientInterface = BrowserFetchClient.create({
      'baseURL': 'https://example.test',
      'headers': { 'X-Client': 'browser' },
      'parameters': { 'page': 2 }
    });
    let receivedUrl = '';
    let receivedHeaders: Headers | undefined;
    globalThis.fetch = async (input, init): Promise<Response> => {
      receivedUrl = String(input);
      receivedHeaders = new Headers(init?.headers);
      return new Response('ok');
    };

    const response = await client.post('/records', { 'json': { 'id': 1 } });

    assert.equal(response.status, 200);
    assert.equal(receivedUrl, 'https://example.test/records?page=2');
    assert.equal(receivedHeaders?.get('Content-Type'), 'application/json');
    assert.equal(receivedHeaders?.get('X-Client'), 'browser');
    await client.destroy();
  });

  void it('rejects a fractional timeout before dispatching a browser request', async () => {
    let fetchCalled = false;
    globalThis.fetch = async (): Promise<Response> => {
      fetchCalled = true;
      return new Response();
    };
    const client = BrowserFetchClient.create();

    await assert.rejects(client.get('https://example.test/records', { 'timeout': 50.5 }), (error): boolean => {
      return error instanceof ConfigurationError && error.message.includes('integer');
    });
    assert.equal(fetchCalled, false);
  });

  void it('intakes browser configuration and preserves its detached request values', async () => {
    const headers = { 'X-Client': 'original' };
    const parameters = { 'filter': undefined, 'page': 1 };
    const client = BrowserFetchClient.create({
      'headers': headers,
      'parameters': parameters
    });
    headers['X-Client'] = 'changed';
    parameters.page = 2;
    let receivedHeaders: Headers | undefined;
    let receivedUrl = '';
    globalThis.fetch = async (input, init): Promise<Response> => {
      receivedHeaders = new Headers(init?.headers);
      receivedUrl = String(input);
      return new Response('ok');
    };

    await client.get('https://example.test/records');

    assert.equal(receivedHeaders?.get('X-Client'), 'original');
    assert.equal(receivedUrl, 'https://example.test/records?page=1');
    assert.throws(() => {
      Reflect.apply(BrowserFetchClient.create, BrowserFetchClient, [{ 'unknown': true }]);
    }, (error: Error): boolean => error instanceof ConfigurationError && error.message.includes('must NOT have additional properties'));
    assert.throws(() => {
      Reflect.apply(BrowserFetchClient.create, BrowserFetchClient, [{ 'parameters': { 'filter': { 'status': 'active' } } }]);
    }, (error: Error): boolean => error instanceof ConfigurationError && error.message.includes('/filter'));
  });
});
