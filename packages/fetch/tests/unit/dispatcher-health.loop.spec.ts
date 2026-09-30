import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import { DispatcherAgent } from '../../src/config/DispatcherAgent.js';
import { UndiciDispatcher } from '../../src/modules/UndiciDispatcher.js';
import { TestDispatcher } from '../../src/testing/TestDispatcher.js';
import { InvalidDispatcherFactory } from '../helpers/InvalidDispatcherFactory.js';
import { RejectionProbe } from '../helpers/RejectionProbe.js';
import { TestTransportFlag } from '../helpers/TestTransportFlag.js';
import scenarioGroups from './dispatcher-health.scenarios.json' with { 'type': 'json' };
import { DispatcherHealthScenarioCaseEntity } from './entities/DispatcherHealthScenarioCaseEntity.js';

class DispatcherHealthRunners {
  static async 'close-after-idle'(scenarioCase: ScenarioCaseOfType<DispatcherHealthScenarioCaseEntity.Type, 'close-after-idle'>): Promise<void> {
    const dispatcher = DispatcherHealthRunners.createDispatcher(scenarioCase.input.dispatcher);
    await dispatcher.close();
    assert.equal(scenarioCase.expected.closed, true);
  }

  static async 'deeply-frozen-stats'(scenarioCase: ScenarioCaseOfType<DispatcherHealthScenarioCaseEntity.Type, 'deeply-frozen-stats'>): Promise<void> {
    const dispatcher = DispatcherHealthRunners.createDispatcher(scenarioCase.input.dispatcher);
    assert.equal(DispatcherHealthRunners.allStatsFrozen(dispatcher), scenarioCase.expected.frozen);
    await dispatcher.destroy();
  }

  static async 'destroy-with-timeout'(scenarioCase: ScenarioCaseOfType<DispatcherHealthScenarioCaseEntity.Type, 'destroy-with-timeout'>): Promise<void> {
    const dispatcher = DispatcherHealthRunners.createDispatcher(scenarioCase.input.dispatcher);
    await dispatcher.destroy(scenarioCase.input.destroy);
    assert.equal(scenarioCase.expected.destroyedAfterWait, true);
  }

  static async 'empty-stats'(scenarioCase: ScenarioCaseOfType<DispatcherHealthScenarioCaseEntity.Type, 'empty-stats'>): Promise<void> {
    const dispatcher = DispatcherHealthRunners.createDispatcher(scenarioCase.input.dispatcher);
    const stats = dispatcher.getStats();
    assert.ok(stats instanceof Map);
    assert.equal(stats.size, scenarioCase.expected.objectKeys);
    await dispatcher.destroy();
  }

  static async 'frozen-stats-object'(scenarioCase: ScenarioCaseOfType<DispatcherHealthScenarioCaseEntity.Type, 'frozen-stats-object'>): Promise<void> {
    const dispatcher = DispatcherHealthRunners.createDispatcher(scenarioCase.input.dispatcher);
    assert.equal(DispatcherHealthRunners.allStatsFrozen(dispatcher), scenarioCase.expected.frozen);
    await dispatcher.destroy();
  }

  static async 'health-interface-shape'(scenarioCase: ScenarioCaseOfType<DispatcherHealthScenarioCaseEntity.Type, 'health-interface-shape'>): Promise<void> {
    const dispatcher = DispatcherHealthRunners.createDispatcher(scenarioCase.input.dispatcher);
    const health = dispatcher.checkDispatcherHealth(scenarioCase.input.origin);
    assert.equal(typeof health.healthy, scenarioCase.expected.healthyType);
    assert.equal(DispatcherHealthRunners.matchesTypeDescriptor(health.queueRatio, scenarioCase.expected.queueRatioType), true);
    assert.equal(DispatcherHealthRunners.matchesTypeDescriptor(health.recommendation, scenarioCase.expected.recommendationType), true);
    assert.equal(DispatcherHealthRunners.matchesTypeDescriptor(health.stats, scenarioCase.expected.statsType), true);
    await dispatcher.destroy();
  }

  static async 'healthy-new-dispatcher'(scenarioCase: ScenarioCaseOfType<DispatcherHealthScenarioCaseEntity.Type, 'healthy-new-dispatcher'>): Promise<void> {
    const dispatcher = DispatcherHealthRunners.createDispatcher(scenarioCase.input.dispatcher);
    const stats = dispatcher.getStats();
    assert.equal(stats.size, scenarioCase.expected.objectKeys);
    const health = dispatcher.checkDispatcherHealth(scenarioCase.input.origin);
    assert.equal(health.healthy, scenarioCase.expected.healthy);
    await dispatcher.destroy();
  }

  static async 'healthy-non-existent-origin'(scenarioCase: ScenarioCaseOfType<DispatcherHealthScenarioCaseEntity.Type, 'healthy-non-existent-origin'>): Promise<void> {
    const dispatcher = DispatcherHealthRunners.createDispatcher(scenarioCase.input.dispatcher);
    const health = dispatcher.checkDispatcherHealth(scenarioCase.input.origin);
    assert.equal(health.healthy, scenarioCase.expected.healthy);
    assert.equal(health.stats, DispatcherHealthRunners.materializeSentinel(scenarioCase.expected.stats));
    assert.equal(health.queueRatio, DispatcherHealthRunners.materializeSentinel(scenarioCase.expected.queueRatio));
    assert.equal(health.recommendation, DispatcherHealthRunners.materializeSentinel(scenarioCase.expected.recommendation));
    await dispatcher.destroy();
  }

  static 'reject-invalid-agent'(scenarioCase: ScenarioCaseOfType<DispatcherHealthScenarioCaseEntity.Type, 'reject-invalid-agent'>): void {
    const caught = RejectionProbe.captureSync(() => {
      const created = InvalidDispatcherFactory.create({});
      return created;
    });
    assert.ok(caught instanceof Error);
    assert.equal(caught.message, scenarioCase.expected.message);
  }

  static async 'stats-object-after-requests'(scenarioCase: ScenarioCaseOfType<DispatcherHealthScenarioCaseEntity.Type, 'stats-object-after-requests'>): Promise<void> {
    using _ = TestTransportFlag.enable();
    const agent = TestDispatcher.create(scenarioCase.input.dispatcher);
    const dispatcher = UndiciDispatcher.create(agent);
    const origin = 'http://127.0.0.1:41234';
    await agent.fetch(`${origin}/ok`, {});
    const stats = dispatcher.getStats();
    assert.ok(stats instanceof Map);
    assert.equal(stats.size, scenarioCase.expected.objectKeys);
    assert.ok(stats.has(origin), 'stats must key the origin that actually issued a request');
    await dispatcher.destroy();
  }

  static async 'structure-after-get-stats'(scenarioCase: ScenarioCaseOfType<DispatcherHealthScenarioCaseEntity.Type, 'structure-after-get-stats'>): Promise<void> {
    const dispatcher = DispatcherHealthRunners.createDispatcher(scenarioCase.input.dispatcher);
    const stats = dispatcher.getStats();
    assert.ok(stats instanceof Map);
    assert.equal(stats.size, scenarioCase.expected.objectKeys);
    assert.equal(DispatcherHealthRunners.allStatsFrozen(dispatcher), scenarioCase.expected.frozen);
    await dispatcher.destroy();
  }

  static async 'test-transport-delegates'(scenarioCase: ScenarioCaseOfType<DispatcherHealthScenarioCaseEntity.Type, 'test-transport-delegates'>): Promise<void> {
    using _ = TestTransportFlag.enable();
    const dispatcher = DispatcherHealthRunners.createDispatcher(scenarioCase.input.dispatcher);
    const health = dispatcher.checkDispatcherHealth(scenarioCase.input.origin);
    assert.equal(health.healthy, scenarioCase.expected.healthy);
    assert.equal(health.queueRatio, undefined);
    assert.equal(health.recommendation, undefined);
    assert.equal(health.stats, undefined);
    assert.equal(dispatcher.getStats().size, scenarioCase.expected.statsKeys);
    await dispatcher.close();
    await dispatcher.destroy({ 'timeout': 1 });
  }

  static async 'test-transport-overloaded'(scenarioCase: ScenarioCaseOfType<DispatcherHealthScenarioCaseEntity.Type, 'test-transport-overloaded'>): Promise<void> {
    using _ = TestTransportFlag.enable();
    const agent = TestDispatcher.create(scenarioCase.input.testDispatcher);
    const dispatcher = UndiciDispatcher.create(agent);
    const request = agent.fetch(scenarioCase.input.path, {});
    const queuedRequest = agent.fetch(scenarioCase.input.queuedPath ?? scenarioCase.input.path, {});
    await Promise.resolve();
    const health = dispatcher.checkDispatcherHealth(scenarioCase.input.origin);
    assert.equal(health.healthy, scenarioCase.expected.healthy);
    assert.equal(health.queueRatio, scenarioCase.expected.queueRatio);
    assert.equal(typeof health.recommendation, 'string');
    assert.equal(health.recommendation?.includes(scenarioCase.expected.recommendationIncludes), true);
    await request;
    await queuedRequest;
    await dispatcher.destroy();
  }

  static async 'test-transport-pressure'(scenarioCase: ScenarioCaseOfType<DispatcherHealthScenarioCaseEntity.Type, 'test-transport-pressure'>): Promise<void> {
    using _ = TestTransportFlag.enable();
    const agent = TestDispatcher.create(scenarioCase.input.testDispatcher);
    const dispatcher = UndiciDispatcher.create(agent);
    const request = agent.fetch(scenarioCase.input.path, {});
    await Promise.resolve();
    const health = dispatcher.checkDispatcherHealth(scenarioCase.input.origin);
    assert.equal(health.healthy, scenarioCase.expected.healthy);
    assert.equal(health.queueRatio, scenarioCase.expected.queueRatio);
    assert.equal(typeof health.recommendation, 'string');
    assert.equal(health.recommendation?.includes(scenarioCase.expected.recommendationIncludes), true);
    await request;
    await dispatcher.destroy();
  }

  private static allStatsFrozen(dispatcher: UndiciDispatcher): boolean {
    const entries = Array.from(dispatcher.getStats().values());
    let allValuesFrozen = true;
    for (let index = 0; index < entries.length; index += 1) {
      allValuesFrozen = allValuesFrozen && Object.isFrozen(entries[index]);
    }
    return allValuesFrozen;
  }

  private static createDispatcher(config: { 'connections': number }): UndiciDispatcher {
    const agent = DispatcherAgent.create(config);
    const dispatcher = UndiciDispatcher.create(agent);
    return dispatcher;
  }

  /** Materializes the `__UNDEFINED__` JSON sentinel into a real `undefined`. */
  private static materializeSentinel(value: string): string | undefined {
    const materialized = value === '__UNDEFINED__' ? undefined : value;
    return materialized;
  }

  private static matchesTypeDescriptor(value: boolean | number | object | string | undefined, descriptor: string): boolean {
    const orUndefinedSuffix = '-or-undefined';
    if (descriptor.endsWith(orUndefinedSuffix)) {
      const base = descriptor.slice(0, -orUndefinedSuffix.length);
      const matches = value === undefined || typeof value === base;
      return matches;
    }
    const matches = typeof value === descriptor;
    return matches;
  }
}

ScenarioSuite.register({
  'entity': DispatcherHealthScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'dispatcher health monitoring',
  'runners': DispatcherHealthRunners
});
