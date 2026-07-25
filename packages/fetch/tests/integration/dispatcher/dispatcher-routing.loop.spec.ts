import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { FetchClient, UndiciDispatcher } from '../../../src/index.js';
import { DispatcherAgent } from '../../../src/config/DispatcherAgent.js';
import { startTestServer, stopTestServer } from '../../helpers/test-server/index.js';
import scenarioGroups from './dispatcher-routing.scenarios.json';

type ScenarioCase =
  | {
      description: string;
      expected: { originRecorded: true };
      input: { dispatcher: { connections: number }; fetchClient: { baseURL: string }; path: string };
      name: string;
      operation: 'routes-through-configured-dispatcher';
    }
  | {
      description: string;
      expected: { idleOriginRecorded: false };
      input: { dispatcher: { connections: number }; fetchClient: { baseURL: string }; path: string };
      name: string;
      operation: 'isolates-unrelated-dispatcher';
    };

const ctx = {
  testUrl: ''
};

void before(async () => {
  ctx.testUrl = await startTestServer();
});

void after(async () => {
  await stopTestServer();
});

const runnerMap: Record<ScenarioCase['operation'], (scenarioCase: ScenarioCase) => Promise<void>> = {
  'routes-through-configured-dispatcher': async (scenarioCase) => {
    const origin = new URL(ctx.testUrl).origin;
    const baseURL = scenarioCase.input.fetchClient.baseURL === '__TEST_SERVER_URL__' ? ctx.testUrl : scenarioCase.input.fetchClient.baseURL;
    const agent = DispatcherAgent.create(scenarioCase.input.dispatcher);
    const dispatcher = UndiciDispatcher.create(agent);
    const client = FetchClient.create({
      baseURL,
      options: { dispatcher: agent }
    });

    const response = await client.get(scenarioCase.input.path);

    assert.strictEqual(response.status, 200);
    assert.ok(origin in dispatcher.getStats(), `expected dispatcher stats to include origin ${origin}`);
    assert.equal(origin in dispatcher.getStats(), scenarioCase.expected.originRecorded);

    await dispatcher.destroy();
  },

  'isolates-unrelated-dispatcher': async (scenarioCase) => {
    const origin = new URL(ctx.testUrl).origin;
    const baseURL = scenarioCase.input.fetchClient.baseURL === '__TEST_SERVER_URL__' ? ctx.testUrl : scenarioCase.input.fetchClient.baseURL;
    const usedAgent = DispatcherAgent.create(scenarioCase.input.dispatcher);
    const idleAgent = DispatcherAgent.create(scenarioCase.input.dispatcher);
    const usedDispatcher = UndiciDispatcher.create(usedAgent);
    const idleDispatcher = UndiciDispatcher.create(idleAgent);
    const client = FetchClient.create({
      baseURL,
      options: { dispatcher: usedAgent }
    });

    const response = await client.get(scenarioCase.input.path);

    assert.strictEqual(response.status, 200);
    assert.ok(origin in usedDispatcher.getStats(), 'request should route through the configured dispatcher');
    assert.equal(origin in usedDispatcher.getStats(), !scenarioCase.expected.idleOriginRecorded);
    assert.ok(!(origin in idleDispatcher.getStats()), 'a dispatcher never passed to the client should see no activity');
    assert.equal(origin in idleDispatcher.getStats(), scenarioCase.expected.idleOriginRecorded);

    await usedDispatcher.destroy();
    await idleDispatcher.destroy();
  }
};

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  await runnerMap[scenarioCase.operation](scenarioCase);
}

void describe('Dispatcher routing', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
