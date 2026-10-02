import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import { DispatcherAgent } from '../../../src/config/DispatcherAgent.js';
import { FetchClient, UndiciDispatcher } from '../../../src/node/index.js';
import { TestServer } from '../../helpers/test-server/TestServer.js';
import scenarioGroups from './dispatcher-routing.scenarios.json' with { 'type': 'json' };
import { DispatcherRoutingScenarioCaseEntity } from './entities/DispatcherRoutingScenarioCaseEntity.js';

class DispatcherRoutingRunners {
  static async 'isolates-unrelated-dispatcher'(scenarioCase: ScenarioCaseOfType<DispatcherRoutingScenarioCaseEntity.Type, 'isolates-unrelated-dispatcher', 'operation'>): Promise<void> {
    using server = TestServer.start();
    const { origin } = server;
    const baseURL = scenarioCase.input.fetchClient.baseURL === '__TEST_SERVER_URL__' ? server.url : scenarioCase.input.fetchClient.baseURL;
    const usedAgent = DispatcherAgent.create(scenarioCase.input.dispatcher);
    const idleAgent = DispatcherAgent.create(scenarioCase.input.dispatcher);
    const usedDispatcher = UndiciDispatcher.create(usedAgent);
    const idleDispatcher = UndiciDispatcher.create(idleAgent);
    const client = FetchClient.create({
      'baseURL': baseURL,
      'options': { 'dispatcher': usedAgent }
    });

    const response = await client.get(scenarioCase.input.path);

    assert.strictEqual(response.status, 200);
    assert.ok(usedDispatcher.getStats().has(origin), 'request should route through the configured dispatcher');
    assert.equal(usedDispatcher.getStats().has(origin), !scenarioCase.expected.idleOriginRecorded);
    assert.ok(!idleDispatcher.getStats().has(origin), 'a dispatcher never passed to the client should see no activity');
    assert.equal(idleDispatcher.getStats().has(origin), scenarioCase.expected.idleOriginRecorded);

    await usedDispatcher.destroy();
    await idleDispatcher.destroy();
  }

  static async 'routes-through-configured-dispatcher'(scenarioCase: ScenarioCaseOfType<DispatcherRoutingScenarioCaseEntity.Type, 'routes-through-configured-dispatcher', 'operation'>): Promise<void> {
    using server = TestServer.start();
    const { origin } = server;
    const baseURL = scenarioCase.input.fetchClient.baseURL === '__TEST_SERVER_URL__' ? server.url : scenarioCase.input.fetchClient.baseURL;
    const agent = DispatcherAgent.create(scenarioCase.input.dispatcher);
    const dispatcher = UndiciDispatcher.create(agent);
    const client = FetchClient.create({
      'baseURL': baseURL,
      'options': { 'dispatcher': agent }
    });

    const response = await client.get(scenarioCase.input.path);

    assert.strictEqual(response.status, 200);
    assert.ok(dispatcher.getStats().has(origin), `expected dispatcher stats to include origin ${origin}`);
    assert.equal(dispatcher.getStats().has(origin), scenarioCase.expected.originRecorded);

    await dispatcher.destroy();
  }
}

ScenarioSuite.registerBy('operation', {
  'entity': DispatcherRoutingScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'Dispatcher routing',
  'runners': DispatcherRoutingRunners
});
