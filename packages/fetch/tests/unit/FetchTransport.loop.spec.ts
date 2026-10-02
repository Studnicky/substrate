import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import { FetchTransport } from '../../src/modules/FetchTransport.js';
import { PlatformCalls } from '../helpers/PlatformCalls.js';
import { FetchTransportScenarioCaseEntity } from './entities/FetchTransportScenarioCaseEntity.js';
import scenarioGroups from './FetchTransport.scenarios.json' with { 'type': 'json' };

class FetchTransportRunners {
  static async 'uses-native-fetch'(scenarioCase: ScenarioCaseOfType<FetchTransportScenarioCaseEntity.Type, 'uses-native-fetch', 'operation'>): Promise<void> {
    const { expected } = scenarioCase;
    const expectedResponse = new Response('native response');
    const originalFetch = globalThis.fetch;
    let receivedUrl = '';
    let receivedInit: RequestInit | undefined;

    globalThis.fetch = (input, init): Promise<Response> => {
      receivedUrl = String(input);
      receivedInit = init;
      const settled = Promise.resolve(expectedResponse);
      return settled;
    };

    try {
      const response = await FetchTransport.fetch(expected.input, expected.init);
      assert.ok(response === expectedResponse);
      assert.equal(receivedUrl, expected.input);
      assert.deepEqual(receivedInit, expected.init);
    } finally {
      globalThis.fetch = originalFetch;
    }
  }

  static async 'uses-test-transport'(scenarioCase: ScenarioCaseOfType<FetchTransportScenarioCaseEntity.Type, 'uses-test-transport', 'operation'>): Promise<void> {
    const { expected } = scenarioCase;
    const testTransport = {
      '__substrateFetchTransport': true,
      'fetch': (input: string, init: { 'method'?: string }): Promise<Response> => {
        const response = FetchTransportRunners.createTestTransportResponse(input, init.method);
        const settled = Promise.resolve(response);
        return settled;
      }
    };

    const response = await FetchTransport.fetch(expected.input, {
      'dispatcher': testTransport,
      ...expected.init
    });

    assert.strictEqual(response.status, 200);
    assert.equal(await response.text(), PlatformCalls.stringify({ 'input': expected.input, 'method': expected.init.method }));
  }

  static async 'uses-undici-fetch'(scenarioCase: ScenarioCaseOfType<FetchTransportScenarioCaseEntity.Type, 'uses-undici-fetch', 'operation'>): Promise<void> {
    const { expected } = scenarioCase;
    const response = await FetchTransport.fetch(`data:text/plain,${PlatformCalls.encodeComponent(expected.responseBody)}`, { 'dispatcher': {} });
    assert.equal(await response.text(), expected.responseBody);
  }

  static async 'uses-undici-fetch-null-dispatcher'(scenarioCase: ScenarioCaseOfType<FetchTransportScenarioCaseEntity.Type, 'uses-undici-fetch-null-dispatcher', 'operation'>): Promise<void> {
    const { expected } = scenarioCase;
    const response = await FetchTransport.fetch(`data:text/plain,${PlatformCalls.encodeComponent(expected.responseBody)}`, { 'dispatcher': null });
    assert.equal(await response.text(), expected.responseBody);
  }

  private static createTestTransportResponse(input: string, method: string | undefined): Response {
    const response = new Response(PlatformCalls.stringify({ 'input': input, 'method': method }), {
      'headers': { 'Content-Type': 'application/json' },
      'status': 200
    });
    return response;
  }
}

ScenarioSuite.registerBy('operation', {
  'entity': FetchTransportScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'node fetch transport',
  'runners': FetchTransportRunners
});
