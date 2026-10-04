import assert from 'node:assert/strict';
import { it } from 'node:test';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import type { FetchClientInterface } from '../../../src/interfaces/FetchClientInterface.js';

import { ScenarioSuite } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { BrowserFetchClient, FetchTransport } from '../../../src/browser/index.js';
import { ConfigurationError } from '../../../src/errors/index.js';
import { InvalidClientFactory } from '../../helpers/InvalidClientFactory.js';
import { RejectionProbe } from '../../helpers/RejectionProbe.js';
import { StubbedFetch } from '../../helpers/StubbedFetch.js';
import { BrowserFetchTransportScenarioCaseEntity } from './entities/BrowserFetchTransportScenarioCaseEntity.js';
import scenarioGroups from './FetchTransport.scenarios.json' with { 'type': 'json' };

class BrowserFetchTransportRunners {
  static declaresClientContractTests(): void {
    void it('satisfies the shared client contract through native fetch', async () => {
      const client: FetchClientInterface = BrowserFetchClient.create({
        'baseURL': 'https://example.test',
        'headers': { 'X-Client': 'browser' },
        'parameters': { 'page': 2 }
      });
      using stub = StubbedFetch.install(new Response('ok'));

      const response = await client.post('/records', { 'json': { 'id': 1 } });

      assert.equal(response.status, 200);
      assert.equal(stub.url, 'https://example.test/records?page=2');
      assert.equal(stub.headers?.get('Content-Type'), 'application/json');
      assert.equal(stub.headers?.get('X-Client'), 'browser');
      await client.destroy();
    });

    void it('rejects a fractional timeout before dispatching a browser request', async () => {
      using stub = StubbedFetch.install(new Response());
      const client = BrowserFetchClient.create();

      const caught = await RejectionProbe.capture(async () => {
        await client.get('https://example.test/records', { 'timeout': 50.5 });
      });
      assert.ok(caught instanceof ConfigurationError);
      assert.ok(caught.message.includes('integer'));
      assert.equal(stub.callCount, 0);
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
      using stub = StubbedFetch.install(new Response('ok'));

      await client.get('https://example.test/records');

      assert.equal(stub.headers?.get('X-Client'), 'original');
      assert.equal(stub.url, 'https://example.test/records?page=1');
      const unknownKey = RejectionProbe.captureSync(() => {
        const created = InvalidClientFactory.createBrowser({ 'unknown': true });
        return created;
      });
      assert.ok(unknownKey instanceof ConfigurationError);
      assert.ok(unknownKey.message.includes('must NOT have additional properties'));
      const nestedFilter = RejectionProbe.captureSync(() => {
        const created = InvalidClientFactory.createBrowser({ 'parameters': { 'filter': { 'status': 'active' } } });
        return created;
      });
      assert.ok(nestedFilter instanceof ConfigurationError);
      assert.ok(nestedFilter.message.includes('/filter'));
    });
  }

  static async 'rejects-node-dispatcher'(scenarioCase: ScenarioCaseOfType<BrowserFetchTransportScenarioCaseEntity.Type, 'rejects-node-dispatcher', 'operation'>): Promise<void> {
    using stub = StubbedFetch.install(new Response());
    const caught = await RejectionProbe.capture(async () => {
      await FetchTransport.fetch('https://example.com/resource', { 'dispatcher': {} });
    });
    assert.ok(caught instanceof ConfigurationError);
    assert.equal(caught.message, scenarioCase.expected.message);
    assert.equal(stub.callCount, 0);
  }

  static async 'uses-native-fetch'(scenarioCase: ScenarioCaseOfType<BrowserFetchTransportScenarioCaseEntity.Type, 'uses-native-fetch', 'operation'>): Promise<void> {
    const expectedResponse = new Response('browser response');
    using stub = StubbedFetch.install(expectedResponse);

    const response = await FetchTransport.fetch(scenarioCase.expected.input, { 'method': 'GET' });

    assert.ok(response === expectedResponse);
    assert.equal(stub.url, scenarioCase.expected.input);
    assert.deepEqual(stub.init, scenarioCase.expected.init);
  }
}

ScenarioSuite.registerBy('operation', {
  'entity': BrowserFetchTransportScenarioCaseEntity,
  'extraTests': BrowserFetchTransportRunners.declaresClientContractTests,
  'file': scenarioGroups,
  'name': 'browser fetch transport',
  'runners': BrowserFetchTransportRunners
});
