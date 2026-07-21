/**
 * Regression tests: requests must actually route through the configured
 * undici dispatcher instead of Node's default global dispatcher.
 */

import assert from 'node:assert';
import {
  after, before, describe, it
} from 'node:test';

import {
  FetchClient, UndiciDispatcher
} from '../../../src/index.js';
import { DispatcherAgent } from '../../../src/config/DispatcherAgent.js';
import {
  startTestServer, stopTestServer
} from '../../helpers/test-server/index.js';

void describe('Dispatcher routing', () => {
  let testUrl: string;

  before(async () => {
    testUrl = await startTestServer();
  });

  after(async () => {
    await stopTestServer();
  });

  void it('records pool activity on the configured dispatcher when passed via options.dispatcher', async () => {
    const agent = DispatcherAgent.create({ connections: 5 });
    const dispatcher = UndiciDispatcher.create(agent);
    const client = FetchClient.create({
      baseURL: testUrl,
      options: { dispatcher: agent }
    });

    const origin = new URL(testUrl).origin;

    const response = await client.get('/posts/1');

    assert.strictEqual(response.status, 200);

    const stats = dispatcher.getStats();

    assert.ok(
      origin in stats,
      `expected dispatcher stats to include origin ${origin} — request did not route through the configured agent`
    );

    await dispatcher.destroy();
  });

  void it('does not record activity on an unrelated dispatcher for the same request', async () => {
    const usedAgent = DispatcherAgent.create({ connections: 5 });
    const idleAgent = DispatcherAgent.create({ connections: 5 });
    const usedDispatcher = UndiciDispatcher.create(usedAgent);
    const idleDispatcher = UndiciDispatcher.create(idleAgent);
    const client = FetchClient.create({
      baseURL: testUrl,
      options: { dispatcher: usedAgent }
    });

    const origin = new URL(testUrl).origin;

    const response = await client.get('/posts/1');

    assert.strictEqual(response.status, 200);
    assert.ok(origin in usedDispatcher.getStats(), 'request should route through the configured dispatcher');
    assert.ok(
      !(origin in idleDispatcher.getStats()),
      'a dispatcher never passed to the client should see no activity'
    );

    await usedDispatcher.destroy();
    await idleDispatcher.destroy();
  });
});
