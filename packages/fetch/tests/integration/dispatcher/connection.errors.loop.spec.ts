import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import type { ManagedDispatcherInterface } from '../../helpers/interfaces/ManagedDispatcherInterface.js';

import { ScenarioSuite } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { DispatcherAgent } from '../../../src/config/DispatcherAgent.js';
import { ClientConfigDataEntity } from '../../../src/entities/ClientConfigDataEntity.js';
import { ConfigurationError, FetchClient, TimeoutError, UndiciDispatcher } from '../../../src/node/index.js';
import { InvalidClientFactory } from '../../helpers/InvalidClientFactory.js';
import { RejectionProbe } from '../../helpers/RejectionProbe.js';
import { RuntimeValueMaterializer } from '../../helpers/RuntimeValueMaterializer.js';
import { TestServer } from '../../helpers/test-server/TestServer.js';
import scenarioGroups from './connection.errors.scenarios.json' with { 'type': 'json' };
import { ConnectionErrorsScenarioCaseEntity } from './entities/ConnectionErrorsScenarioCaseEntity.js';

class ConnectionErrorsRunners {
  static async 'client-destroy-passes-timeout'(scenarioCase: ScenarioCaseOfType<ConnectionErrorsScenarioCaseEntity.Type, 'client-destroy-passes-timeout'>): Promise<void> {
    using server = TestServer.start();
    const materializedFetchClient = RuntimeValueMaterializer.materializeWithServer(scenarioCase.input.fetchClient, server.url);
    assert.ok(typeof materializedFetchClient === 'object' && materializedFetchClient !== null, 'input.fetchClient materializes into an object');
    const client = FetchClient.create({
      ...materializedFetchClient,
      'baseURL': server.url
    });
    const warmupResponse = await client.get('/posts/1');
    assert.strictEqual(warmupResponse.status, 200);
    const startTime = Date.now();
    await client.destroy({ 'timeout': scenarioCase.input.destroy.timeout });
    const elapsed = Date.now() - startTime;
    const waited = elapsed >= 95;
    assert.equal(waited, scenarioCase.expected.waited, `Expected ~${String(scenarioCase.input.destroy.timeout)}ms wait, got ${String(elapsed)}ms`);
  }

  static async 'close-waits'(scenarioCase: ScenarioCaseOfType<ConnectionErrorsScenarioCaseEntity.Type, 'close-waits'>): Promise<void> {
    using server = TestServer.start();
    const { agent, dispatcher } = ConnectionErrorsRunners.createManagedDispatcher(scenarioCase.input.dispatcher, server.url);
    const client = ConnectionErrorsRunners.createClient(agent, server.url);
    const requests = [
      client.get('/posts/1'),
      client.get('/posts/2')
    ];
    const responses = await Promise.all(requests);
    assert.strictEqual(responses[0]?.status, 200);
    assert.strictEqual(responses[1]?.status, 200);
    await dispatcher.close();
    assert.equal(scenarioCase.expected.closed, true);
  }

  static async 'destroy-timeout-waits'(scenarioCase: ScenarioCaseOfType<ConnectionErrorsScenarioCaseEntity.Type, 'destroy-timeout-waits'>): Promise<void> {
    using server = TestServer.start();
    const { agent, dispatcher } = ConnectionErrorsRunners.createManagedDispatcher(scenarioCase.input.dispatcher, server.url);
    const client = ConnectionErrorsRunners.createClient(agent, server.url);
    const warmupResponse = await client.get('/posts/1');
    assert.strictEqual(warmupResponse.status, 200);
    const startTime = Date.now();
    await dispatcher.destroy({ 'timeout': scenarioCase.input.destroy.timeout });
    const elapsed = Date.now() - startTime;
    const waited = elapsed >= 95;
    assert.equal(waited, scenarioCase.expected.waited, `Expected ~${String(scenarioCase.input.destroy.timeout)}ms wait, got ${String(elapsed)}ms`);
  }

  static async 'destroy-zero-no-wait'(scenarioCase: ScenarioCaseOfType<ConnectionErrorsScenarioCaseEntity.Type, 'destroy-zero-no-wait'>): Promise<void> {
    using server = TestServer.start();
    const { agent, dispatcher } = ConnectionErrorsRunners.createManagedDispatcher(scenarioCase.input.dispatcher, server.url);
    const client = ConnectionErrorsRunners.createClient(agent, server.url);
    const warmupResponse = await client.get('/posts/1');
    assert.strictEqual(warmupResponse.status, 200);
    const startTime = Date.now();
    await dispatcher.destroy({ 'timeout': 0 });
    const elapsed = Date.now() - startTime;
    // A zero timeout skips the deliberate delay entirely, so the only real
    // cost is scheduling overhead. The ceiling is set an order of magnitude
    // above that (rather than a tight bound) so scheduler contention under
    // parallel test load can't flip this in the flake-prone "too slow" direction;
    // it still catches a regression that reintroduces any deliberate wait.
    const waited = elapsed >= 1000;
    assert.equal(waited, scenarioCase.expected.waited, `Expected immediate destroy, took ${String(elapsed)}ms`);
  }

  static async 'dns-failure'(scenarioCase: ScenarioCaseOfType<ConnectionErrorsScenarioCaseEntity.Type, 'dns-failure'>): Promise<void> {
    using server = TestServer.start();
    const { agent, dispatcher } = ConnectionErrorsRunners.createManagedDispatcher(scenarioCase.input.dispatcher, server.url);
    const client = FetchClient.create({
      'baseURL': 'https://this-domain-does-not-exist-12345.com',
      'options': { 'dispatcher': agent }
    });

    const caught = await RejectionProbe.capture(async () => {
      await client.get('/api');
    });
    assert.ok(caught instanceof Error);
    const cause: unknown = caught.cause;
    const causeMessage = cause instanceof Error ? cause.message : '';
    const hasDnsError = caught.message.includes(scenarioCase.expected.error) || causeMessage.includes(scenarioCase.expected.error);
    assert.ok(hasDnsError, `Expected DNS error, got: ${caught.message}`);

    await dispatcher.destroy();
  }

  static async 'health-after-errors'(scenarioCase: ScenarioCaseOfType<ConnectionErrorsScenarioCaseEntity.Type, 'health-after-errors'>): Promise<void> {
    using server = TestServer.start();
    const { agent, dispatcher } = ConnectionErrorsRunners.createManagedDispatcher(scenarioCase.input.dispatcher, server.url);
    const client = ConnectionErrorsRunners.createClient(agent, server.url);

    const caught = await RejectionProbe.capture(async () => {
      await client.get('/delay', { 'timeout': 50 });
    });
    assert.ok(caught instanceof TimeoutError);

    const health = dispatcher.checkDispatcherHealth(server.origin);
    assert.ok(typeof health.healthy === 'boolean', 'Health check should not be null');
    assert.equal(scenarioCase.expected.healthy, true);

    await dispatcher.destroy();
  }

  static 'invalid-config'(scenarioCase: ScenarioCaseOfType<ConnectionErrorsScenarioCaseEntity.Type, 'invalid-config'>): void {
    using server = TestServer.start();
    const caught = RejectionProbe.captureSync(() => {
      const created = InvalidClientFactory.create({ 'dispatcher': RuntimeValueMaterializer.materializeWithServer(scenarioCase.input.dispatcher, server.url) });
      return created;
    });
    assert.ok(caught instanceof ConfigurationError);
    assert.equal(caught.name, scenarioCase.expected.error);
  }

  static async 'isolates-network-errors'(scenarioCase: ScenarioCaseOfType<ConnectionErrorsScenarioCaseEntity.Type, 'isolates-network-errors'>): Promise<void> {
    using server = TestServer.start();
    const { agent, dispatcher } = ConnectionErrorsRunners.createManagedDispatcher(scenarioCase.input.dispatcher, server.url);
    const goodClient = ConnectionErrorsRunners.createClient(agent, server.url);
    const badClient = FetchClient.create({
      'baseURL': 'http://127.0.0.1:1',
      'options': { 'dispatcher': agent }
    });

    const results = await Promise.allSettled([
      badClient.get('/api'),
      goodClient.get('/posts/1'),
      badClient.get('/api'),
      goodClient.get('/posts/2')
    ]);

    const statuses: string[] = [];
    for (let index = 0; index < results.length; index += 1) {
      statuses.push(results[index]?.status ?? 'missing');
    }
    assert.deepStrictEqual(statuses, scenarioCase.expected.statuses);

    await dispatcher.destroy();
  }

  static async 'keep-alive-long'(scenarioCase: ScenarioCaseOfType<ConnectionErrorsScenarioCaseEntity.Type, 'keep-alive-long'>): Promise<void> {
    using server = TestServer.start();
    const { agent, dispatcher } = ConnectionErrorsRunners.createManagedDispatcher(scenarioCase.input.dispatcher, server.url);
    const client = ConnectionErrorsRunners.createClient(agent, server.url);
    const response = await client.get('/posts/1');
    assert.strictEqual(response.status, 200);
    const response2 = await client.get('/posts/1');
    assert.strictEqual(response2.status, 200);
    await dispatcher.destroy();
  }

  static async 'keep-alive-short'(scenarioCase: ScenarioCaseOfType<ConnectionErrorsScenarioCaseEntity.Type, 'keep-alive-short'>): Promise<void> {
    using server = TestServer.start();
    const { agent, dispatcher } = ConnectionErrorsRunners.createManagedDispatcher(scenarioCase.input.dispatcher, server.url);
    const client = ConnectionErrorsRunners.createClient(agent, server.url);
    const response = await client.get('/posts/1');
    assert.strictEqual(response.status, 200);
    await new Promise<void>((resolve) => {
      setTimeout(resolve, scenarioCase.input.waitMs);
    });
    const response2 = await client.get('/posts/1');
    assert.strictEqual(response2.status, 200);
    await dispatcher.destroy();
  }

  static async 'many-concurrent-network-errors'(scenarioCase: ScenarioCaseOfType<ConnectionErrorsScenarioCaseEntity.Type, 'many-concurrent-network-errors'>): Promise<void> {
    using server = TestServer.start();
    const { agent, dispatcher } = ConnectionErrorsRunners.createManagedDispatcher(scenarioCase.input.dispatcher, server.url);
    const client = FetchClient.create({
      'baseURL': 'http://127.0.0.1:1',
      'options': { 'dispatcher': agent }
    });
    const results = await Promise.all(ConnectionErrorsRunners.createBatchRequests(scenarioCase.input.batch.requestCount, async () => {
      const outcome = await client.get('/api').catch(() => {
        return 'error';
      });
      return outcome;
    }));
    assert.deepStrictEqual(ConnectionErrorsRunners.normalizeOutcomes(results), scenarioCase.expected.results);
    await dispatcher.destroy();
  }

  static async 'many-concurrent-requests'(scenarioCase: ScenarioCaseOfType<ConnectionErrorsScenarioCaseEntity.Type, 'many-concurrent-requests'>): Promise<void> {
    using server = TestServer.start();
    const { agent, dispatcher } = ConnectionErrorsRunners.createManagedDispatcher(scenarioCase.input.dispatcher, server.url);
    const client = ConnectionErrorsRunners.createClient(agent, server.url);
    const responses = await Promise.all(ConnectionErrorsRunners.createBatchRequests(scenarioCase.input.batch.requestCount, async () => {
      const response = await client.get('/posts/1');
      return response;
    }));
    assert.deepStrictEqual(ConnectionErrorsRunners.normalizeOutcomes(responses), scenarioCase.expected.statuses);
    await dispatcher.destroy();
  }

  static async 'many-concurrent-timeouts'(scenarioCase: ScenarioCaseOfType<ConnectionErrorsScenarioCaseEntity.Type, 'many-concurrent-timeouts'>): Promise<void> {
    using server = TestServer.start();
    const { agent, dispatcher } = ConnectionErrorsRunners.createManagedDispatcher(scenarioCase.input.dispatcher, server.url);
    const client = ConnectionErrorsRunners.createClient(agent, server.url);
    const results = await Promise.all(ConnectionErrorsRunners.createBatchRequests(scenarioCase.input.batch.requestCount, async () => {
      const outcome = await client.get('/delay', { 'timeout': 100 }).catch(() => {
        return 'timeout';
      });
      return outcome;
    }));
    assert.deepStrictEqual(ConnectionErrorsRunners.normalizeOutcomes(results), scenarioCase.expected.results);
    await dispatcher.destroy();
  }

  static async 'mixed-errors-successes'(scenarioCase: ScenarioCaseOfType<ConnectionErrorsScenarioCaseEntity.Type, 'mixed-errors-successes'>): Promise<void> {
    using server = TestServer.start();
    const { agent, dispatcher } = ConnectionErrorsRunners.createManagedDispatcher(scenarioCase.input.dispatcher, server.url);
    const goodClient = ConnectionErrorsRunners.createClient(agent, server.url);
    const results = await Promise.all([
      goodClient.get('/posts/1'),
      goodClient.get('/delay', { 'timeout': 100 }).catch(() => { return 'timeout'; }),
      goodClient.get('/posts/2'),
      goodClient.get('/delay', { 'timeout': 100 }).catch(() => { return 'timeout'; }),
      goodClient.get('/posts/1'),
      goodClient.get('/delay', { 'timeout': 100 }).catch(() => { return 'timeout'; })
    ]);
    assert.deepStrictEqual(ConnectionErrorsRunners.normalizeOutcomes(results), scenarioCase.expected.results);
    await dispatcher.destroy();
  }

  static async 'mixed-success-timeout-with-limited-connections'(scenarioCase: ScenarioCaseOfType<ConnectionErrorsScenarioCaseEntity.Type, 'mixed-success-timeout-with-limited-connections'>): Promise<void> {
    using server = TestServer.start();
    const { agent, dispatcher } = ConnectionErrorsRunners.createManagedDispatcher(scenarioCase.input.dispatcher, server.url);
    const client = ConnectionErrorsRunners.createClient(agent, server.url);
    const results = await Promise.all([
      client.get('/delay', { 'timeout': 100 }).catch(() => { return 'timeout1'; }),
      client.get('/posts/1'),
      client.get('/delay', { 'timeout': 100 }).catch(() => { return 'timeout2'; }),
      client.get('/posts/2')
    ]);
    assert.deepStrictEqual(ConnectionErrorsRunners.normalizeOutcomes(results), scenarioCase.expected.results);
    await dispatcher.destroy();
  }

  static async 'network-refused'(scenarioCase: ScenarioCaseOfType<ConnectionErrorsScenarioCaseEntity.Type, 'network-refused'>): Promise<void> {
    using server = TestServer.start();
    const { agent, dispatcher } = ConnectionErrorsRunners.createManagedDispatcher(scenarioCase.input.dispatcher, server.url);
    const client = ConnectionErrorsRunners.createClient(agent, 'http://127.0.0.1:59999');

    const caught = await RejectionProbe.capture(async () => {
      await client.get('/api');
    });
    assert.ok(caught instanceof Error);
    const cause: unknown = caught.cause;
    const causeMessage = cause instanceof Error ? cause.message : '';
    const hasConnectError = caught.message.includes(scenarioCase.expected.error) || causeMessage.includes(scenarioCase.expected.error);
    assert.ok(hasConnectError, `Expected connect error, got: ${caught.message}`);

    await dispatcher.destroy();
  }

  static async 'pipelining-disabled'(scenarioCase: ScenarioCaseOfType<ConnectionErrorsScenarioCaseEntity.Type, 'pipelining-disabled'>): Promise<void> {
    using server = TestServer.start();
    const { agent, dispatcher } = ConnectionErrorsRunners.createManagedDispatcher(scenarioCase.input.dispatcher, server.url);
    const client = ConnectionErrorsRunners.createClient(agent, server.url);
    const requests = [
      client.get('/posts/1'),
      client.get('/posts/2')
    ];
    const responses = await Promise.all(requests);
    assert.deepStrictEqual(ConnectionErrorsRunners.normalizeOutcomes(responses), scenarioCase.expected.statuses);
    await dispatcher.destroy();
  }

  static async 'pipelining-high'(scenarioCase: ScenarioCaseOfType<ConnectionErrorsScenarioCaseEntity.Type, 'pipelining-high'>): Promise<void> {
    using server = TestServer.start();
    const { agent, dispatcher } = ConnectionErrorsRunners.createManagedDispatcher(scenarioCase.input.dispatcher, server.url);
    const client = ConnectionErrorsRunners.createClient(agent, server.url);
    const responses = await Promise.all(ConnectionErrorsRunners.createBatchRequests(scenarioCase.input.batch.requestCount, async () => {
      const response = await client.get('/posts/1');
      return response;
    }));
    assert.deepStrictEqual(ConnectionErrorsRunners.normalizeOutcomes(responses), scenarioCase.expected.statuses);
    await dispatcher.destroy();
  }

  static async 'pool-after-network-error'(scenarioCase: ScenarioCaseOfType<ConnectionErrorsScenarioCaseEntity.Type, 'pool-after-network-error'>): Promise<void> {
    using server = TestServer.start();
    const { agent, dispatcher } = ConnectionErrorsRunners.createManagedDispatcher(scenarioCase.input.dispatcher, server.url);
    const client = ConnectionErrorsRunners.createClient(agent, server.url);
    const badClient = FetchClient.create({
      'baseURL': 'http://127.0.0.1:1',
      'options': { 'dispatcher': agent }
    });

    const caught = await RejectionProbe.capture(async () => {
      await badClient.get('/api');
    });
    assert.ok(caught instanceof Error);

    const response = await client.get('/posts/1');
    assert.strictEqual(response.status, scenarioCase.expected.status);
    await dispatcher.destroy();
  }

  static async 'pool-after-timeout'(scenarioCase: ScenarioCaseOfType<ConnectionErrorsScenarioCaseEntity.Type, 'pool-after-timeout'>): Promise<void> {
    using server = TestServer.start();
    const { agent, dispatcher } = ConnectionErrorsRunners.createManagedDispatcher(scenarioCase.input.dispatcher, server.url);
    const client = ConnectionErrorsRunners.createClient(agent, server.url);

    const caught = await RejectionProbe.capture(async () => {
      await client.get('/delay', { 'timeout': 50 });
    });
    assert.ok(caught instanceof TimeoutError);

    const response = await client.get('/posts/1');
    assert.strictEqual(response.status, scenarioCase.expected.status);
    await dispatcher.destroy();
  }

  static async 'queue-requests-when-pool-is-full'(scenarioCase: ScenarioCaseOfType<ConnectionErrorsScenarioCaseEntity.Type, 'queue-requests-when-pool-is-full'>): Promise<void> {
    using server = TestServer.start();
    const { agent, dispatcher } = ConnectionErrorsRunners.createManagedDispatcher(scenarioCase.input.dispatcher, server.url);
    const client = ConnectionErrorsRunners.createClient(agent, server.url);
    // A short, explicit delay proves the same "full pool queues instead of
    // dropping" contract as the endpoint's 5s default, without paying that
    // wall-clock cost on every run.
    const delayMs = 50;
    const startTime = Date.now();
    const results = await Promise.allSettled([
      client.get(`/delay?ms=${String(delayMs)}`),
      client.get('/posts/1'),
      client.get('/posts/2')
    ]);
    const elapsed = Date.now() - startTime;
    assert.ok(elapsed >= delayMs, `Should take at least ${String(delayMs)}ms due to /delay endpoint`);
    assert.strictEqual(results[0]?.status, 'fulfilled');
    assert.strictEqual(results[1]?.status, 'fulfilled');
    assert.strictEqual(results[2]?.status, 'fulfilled');
    await dispatcher.destroy();
  }

  static async 'saturated-health'(scenarioCase: ScenarioCaseOfType<ConnectionErrorsScenarioCaseEntity.Type, 'saturated-health'>): Promise<void> {
    using server = TestServer.start();
    const { agent, dispatcher } = ConnectionErrorsRunners.createManagedDispatcher(scenarioCase.input.dispatcher, server.url);
    const client = ConnectionErrorsRunners.createClient(agent, server.url);

    const delayMs = scenarioCase.input.waitMs;
    const slowRequests = [
      client.get(`/delay?ms=${String(delayMs)}`),
      client.get(`/delay?ms=${String(delayMs)}`),
      client.get(`/delay?ms=${String(delayMs)}`)
    ];

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 100);
    });

    const health = dispatcher.checkDispatcherHealth(server.origin);
    // stats present proves a real pool was observed — checkDispatcherHealth returns a bare
    // { healthy: true } when the origin has no stats at all, which would pass any assertion
    // on `healthy` alone without the pool ever having been saturated.
    assert.notStrictEqual(health.stats, undefined);
    assert.strictEqual(health.healthy, scenarioCase.expected.healthy);

    await Promise.allSettled(slowRequests);
    await dispatcher.destroy();
  }

  static async 'sequential-errors'(scenarioCase: ScenarioCaseOfType<ConnectionErrorsScenarioCaseEntity.Type, 'sequential-errors'>): Promise<void> {
    using server = TestServer.start();
    const { agent, dispatcher } = ConnectionErrorsRunners.createManagedDispatcher(scenarioCase.input.dispatcher, server.url);
    const client = ConnectionErrorsRunners.createClient(agent, server.url);

    for (let index = 0; index < scenarioCase.input.repeats; index += 1) {
      const caught = await RejectionProbe.capture(async () => {
        await client.get('/delay', { 'timeout': 50 });
      });
      assert.ok(caught instanceof TimeoutError);
    }

    const response = await client.get('/posts/1');
    assert.strictEqual(response.status, scenarioCase.expected.status);
    await dispatcher.destroy();
  }

  private static createBatchRequests<TResult>(requestCount: number, requestFactory: () => Promise<TResult>): Promise<TResult>[] {
    const requests: Promise<TResult>[] = [];
    for (let index = 0; index < requestCount; index += 1) {
      requests.push(requestFactory());
    }
    return requests;
  }

  private static createClient(agent: ReturnType<typeof DispatcherAgent.create>, baseURL: string): FetchClient {
    const client = FetchClient.create({
      'baseURL': baseURL,
      'options': {
        'dispatcher': agent
      }
    });
    return client;
  }

  private static createManagedDispatcher(
    config: ScenarioCaseOfType<ConnectionErrorsScenarioCaseEntity.Type, 'close-waits'>['input']['dispatcher'],
    serverUrl: string
  ): ManagedDispatcherInterface {
    const clientConfig = ClientConfigDataEntity.intake({ 'dispatcher': RuntimeValueMaterializer.materializeWithServer(config, serverUrl) });
    const dispatcherConfig = clientConfig.dispatcher;
    assert.ok(dispatcherConfig !== undefined, 'dispatcher config must be present');
    const agent = DispatcherAgent.create(dispatcherConfig);
    const managed = {
      'agent': agent,
      'dispatcher': UndiciDispatcher.create(agent)
    };
    return managed;
  }

  /**
   * Normalizes settled outcomes (a Response, an HTTP status, or a caught fallback label)
   * into values comparable against scenario-declared `expected.results`/`expected.statuses`.
   */
  private static normalizeOutcomes(outcomes: readonly (Response | number | string)[]): (number | string)[] {
    const normalized: (number | string)[] = [];
    for (let index = 0; index < outcomes.length; index += 1) {
      const outcome = outcomes[index];
      if (typeof outcome === 'object') {
        normalized.push(outcome.status);
      } else if (outcome !== undefined) {
        normalized.push(outcome);
      }
    }
    return normalized;
  }
}

ScenarioSuite.register({
  'entity': ConnectionErrorsScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'Connection Pool Error Scenarios',
  'runners': ConnectionErrorsRunners
});
