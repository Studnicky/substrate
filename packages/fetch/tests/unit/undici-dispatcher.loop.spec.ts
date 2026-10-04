import { JsonObject } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { mock } from 'node:test';
import { Agent } from 'undici';

import type { ScenarioCaseOfType } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { ConfigurationError } from '../../src/errors/index.js';
import { UndiciDispatcher } from '../../src/modules/UndiciDispatcher.js';
import { TestDispatcher } from '../../src/testing/TestDispatcher.js';
import { InvalidDispatcherFactory } from '../helpers/InvalidDispatcherFactory.js';
import { RejectionProbe } from '../helpers/RejectionProbe.js';
import { UndiciDispatcherScenarioCaseEntity } from './entities/UndiciDispatcherScenarioCaseEntity.js';
import scenarioGroups from './undici-dispatcher.scenarios.json' with { 'type': 'json' };

/** An undici `Agent` that counts `close` and `destroy` calls instead of tearing down sockets. */
class SpyAgent extends Agent {
  closeCalls = 0;
  destroyCalls = 0;

  override async close(): Promise<void> {
    this.closeCalls += 1;
    await Promise.resolve();
  }

  override async destroy(): Promise<void> {
    this.destroyCalls += 1;
    await Promise.resolve();
  }
}

class UndiciDispatcherRunners {
  static async 'close-agent'(scenarioCase: ScenarioCaseOfType<UndiciDispatcherScenarioCaseEntity.Type, 'close-agent'>): Promise<void> {
    const agent = new SpyAgent(scenarioCase.input.agent ?? {});
    const dispatcher = UndiciDispatcher.create(agent);
    await dispatcher.close();
    assert.equal(agent.closeCalls, 1);
  }

  static 'constructor-invalid-agent'(scenarioCase: ScenarioCaseOfType<UndiciDispatcherScenarioCaseEntity.Type, 'constructor-invalid-agent'>): void {
    const caught = RejectionProbe.captureSync(() => {
      const created = InvalidDispatcherFactory.create(scenarioCase.input.agent);
      return created;
    });
    assert.ok(caught instanceof ConfigurationError);
    assert.equal(caught.message, scenarioCase.expected.message);
  }

  static async 'destroy-agent'(scenarioCase: ScenarioCaseOfType<UndiciDispatcherScenarioCaseEntity.Type, 'destroy-agent'>): Promise<void> {
    const agent = new SpyAgent(scenarioCase.input.agent ?? {});
    const dispatcher = UndiciDispatcher.create(agent);
    await dispatcher.destroy(scenarioCase.input.timeout === undefined ? undefined : { 'timeout': scenarioCase.input.timeout });
    assert.equal(agent.destroyCalls, 1);
  }

  static async 'destroy-agent-delay'(scenarioCase: ScenarioCaseOfType<UndiciDispatcherScenarioCaseEntity.Type, 'destroy-agent-delay'>): Promise<void> {
    const agent = new SpyAgent(scenarioCase.input.agent ?? {});
    const dispatcher = UndiciDispatcher.create(agent);
    const configuredTimeout = scenarioCase.input.timeout ?? 1;

    // Fake timers stand in for the wall clock: RaceTimeout.wait schedules a real setTimeout, so
    // controlling when it fires proves the destroy call is gated behind exactly the configured
    // delay, deterministically and without any real wait.
    mock.timers.enable({ 'apis': ['setTimeout'] });
    try {
      const destroyPromise = dispatcher.destroy({ 'timeout': configuredTimeout });
      assert.equal(agent.destroyCalls, 0, 'agent.destroy must not run before the configured delay elapses');
      mock.timers.tick(configuredTimeout - 1);
      assert.equal(agent.destroyCalls, 0, 'agent.destroy must not run one tick before the configured delay elapses');
      mock.timers.tick(1);
      await destroyPromise;
      assert.equal(agent.destroyCalls, 1);
    } finally {
      mock.timers.reset();
    }
  }

  static async 'destroy-agent-zero'(scenarioCase: ScenarioCaseOfType<UndiciDispatcherScenarioCaseEntity.Type, 'destroy-agent-zero'>): Promise<void> {
    const agent = new SpyAgent(scenarioCase.input.agent ?? {});
    const dispatcher = UndiciDispatcher.create(agent);
    await dispatcher.destroy({ 'timeout': 0 });
    assert.equal(agent.destroyCalls, 1);
  }

  static 'get-stats-freeze'(scenarioCase: ScenarioCaseOfType<UndiciDispatcherScenarioCaseEntity.Type, 'get-stats-freeze'>): void {
    const dispatcher = UndiciDispatcherRunners.createDispatcherWithStats(scenarioCase.input.stats);
    const stats = dispatcher.getStats();
    assert.ok(stats instanceof Map);
    assert.equal(Object.isFrozen(stats.get(scenarioCase.input.origin)), true);
  }

  static 'health-invalid-stats'(scenarioCase: ScenarioCaseOfType<UndiciDispatcherScenarioCaseEntity.Type, 'health-invalid-stats'>): void {
    const dispatcher = UndiciDispatcherRunners.createDispatcherWithStats(scenarioCase.input.stats ?? {});
    const health = dispatcher.checkDispatcherHealth(scenarioCase.input.origin);
    assert.deepStrictEqual(health, { 'healthy': true });
  }

  static 'health-no-stats'(scenarioCase: ScenarioCaseOfType<UndiciDispatcherScenarioCaseEntity.Type, 'health-no-stats'>): void {
    const dispatcher = UndiciDispatcherRunners.createDispatcherWithStats({});
    const health = dispatcher.checkDispatcherHealth(scenarioCase.input.origin);
    assert.deepStrictEqual(health, { 'healthy': true });
  }

  static 'health-ok'(scenarioCase: ScenarioCaseOfType<UndiciDispatcherScenarioCaseEntity.Type, 'health-ok'>): void {
    UndiciDispatcherRunners.runHealthScenario(scenarioCase);
  }

  static 'health-overload'(scenarioCase: ScenarioCaseOfType<UndiciDispatcherScenarioCaseEntity.Type, 'health-overload'>): void {
    UndiciDispatcherRunners.runHealthScenario(scenarioCase);
  }

  static 'health-pressure'(scenarioCase: ScenarioCaseOfType<UndiciDispatcherScenarioCaseEntity.Type, 'health-pressure'>): void {
    UndiciDispatcherRunners.runHealthScenario(scenarioCase);
  }

  static async 'test-dispatcher-close'(scenarioCase: ScenarioCaseOfType<UndiciDispatcherScenarioCaseEntity.Type, 'test-dispatcher-close'>): Promise<void> {
    const dispatcher = UndiciDispatcherRunners.createTestUndiciDispatcher(scenarioCase.input.testDispatcher);
    await dispatcher.close();
    assert.equal(dispatcher instanceof UndiciDispatcher, true);
  }

  static async 'test-dispatcher-destroy'(scenarioCase: ScenarioCaseOfType<UndiciDispatcherScenarioCaseEntity.Type, 'test-dispatcher-destroy'>): Promise<void> {
    const dispatcher = UndiciDispatcherRunners.createTestUndiciDispatcher(scenarioCase.input.testDispatcher);
    await dispatcher.destroy();
    assert.equal(dispatcher instanceof UndiciDispatcher, true);
  }

  static 'test-dispatcher-health'(scenarioCase: ScenarioCaseOfType<UndiciDispatcherScenarioCaseEntity.Type, 'test-dispatcher-health'>): void {
    const dispatcher = UndiciDispatcherRunners.createTestUndiciDispatcher(scenarioCase.input.testDispatcher);
    const health = dispatcher.checkDispatcherHealth(scenarioCase.input.origin);
    assert.equal(typeof health.healthy, 'boolean');
  }

  private static createAgentWithStats(stats: object): Agent {
    const agent = new Agent({});
    const handler: ProxyHandler<Agent> = {
      'get': function readProperty(target, property, receiver): unknown {
        const value: unknown = property === 'stats' ? stats : Reflect.get(target, property, receiver);
        return value;
      }
    };
    const statsAgent = new Proxy(agent, handler);
    return statsAgent;
  }

  private static createDispatcherWithStats(stats: object): UndiciDispatcher {
    const dispatcher = UndiciDispatcher.create(UndiciDispatcherRunners.createAgentWithStats(stats));
    return dispatcher;
  }

  private static createTestUndiciDispatcher(testDispatcher: ScenarioCaseOfType<UndiciDispatcherScenarioCaseEntity.Type, 'test-dispatcher-close'>['input']['testDispatcher']): UndiciDispatcher {
    const agent = TestDispatcher.create(testDispatcher);
    const dispatcher = UndiciDispatcher.create(agent);
    return dispatcher;
  }

  private static runHealthScenario(scenarioCase: ScenarioCaseOfType<UndiciDispatcherScenarioCaseEntity.Type, 'health-ok' | 'health-overload' | 'health-pressure'>): void {
    const entries = new Map<string, unknown>();
    entries.set(scenarioCase.input.origin, scenarioCase.input.stats);
    const dispatcher = UndiciDispatcherRunners.createDispatcherWithStats(JsonObject.fromEntries(entries));
    const health = dispatcher.checkDispatcherHealth(scenarioCase.input.origin);
    assert.equal(health.healthy, scenarioCase.expected.healthy);
    assert.equal(typeof health.queueRatio, 'number');
    assert.equal(health.stats !== undefined, true);
    if (scenarioCase.expected.recommendationIncludes !== undefined) {
      assert.equal(health.recommendation?.includes(scenarioCase.expected.recommendationIncludes), true);
    } else {
      assert.equal(health.recommendation, undefined);
    }
  }
}

ScenarioSuite.register({
  'entity': UndiciDispatcherScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'undici dispatcher',
  'runners': UndiciDispatcherRunners
});
