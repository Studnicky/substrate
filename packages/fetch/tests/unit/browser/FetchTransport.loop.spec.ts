import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { FetchTransport } from '../../../src/browser/index.js';
import { ConfigurationError } from '../../../src/errors/index.js';
import { RejectionProbe } from '../../helpers/RejectionProbe.js';
import { StubbedFetch } from '../../helpers/StubbedFetch.js';
import { BrowserFetchTransportScenarioCaseEntity } from './entities/BrowserFetchTransportScenarioCaseEntity.js';
import scenarioGroups from './FetchTransport.scenarios.json' with { 'type': 'json' };

class BrowserFetchTransportRunners {
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
  'file': scenarioGroups,
  'name': 'browser fetch transport',
  'runners': BrowserFetchTransportRunners
});
