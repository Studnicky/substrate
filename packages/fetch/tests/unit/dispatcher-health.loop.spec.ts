import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DispatcherAgent } from '../../src/config/DispatcherAgent.js';
import { UndiciDispatcher } from '../../src/modules/UndiciDispatcher.js';
import { TestDispatcher } from '../../src/testing/TestDispatcher.js';

import { DispatcherHealthScenarioCaseEntity } from './entities/DispatcherHealthScenarioCaseEntity.js';
import scenarioGroups from './dispatcher-health.scenarios.json' with { type: 'json' };

type ScenarioCase = DispatcherHealthScenarioCaseEntity.Type;

const fileIntake = ScenarioFileCompiler.compileIntake(DispatcherHealthScenarioCaseEntity.Schema, DispatcherHealthScenarioCaseEntity.Node);

function createDispatcher(config: { connections: number }): UndiciDispatcher {
  const agent = DispatcherAgent.create(config);
  return UndiciDispatcher.create(agent);
}

function matchesTypeDescriptor(value: boolean | number | object | string | undefined, descriptor: string): boolean {
  const orUndefinedSuffix = '-or-undefined';
  if (descriptor.endsWith(orUndefinedSuffix)) {
    const base = descriptor.slice(0, -orUndefinedSuffix.length);
    return value === undefined || typeof value === base;
  }
  return typeof value === descriptor;
}

/** Materializes the `__UNDEFINED__` JSON sentinel into a real `undefined`. */
function materializeSentinel(value: string): undefined | string {
  return value === '__UNDEFINED__' ? undefined : value;
}

type ScenarioRunner<Shape extends ScenarioCase['shape']> = (scenarioCase: Extract<ScenarioCase, { shape: Shape }>) => Promise<void>;
type RunnerMap = { [Shape in ScenarioCase['shape']]: ScenarioRunner<Shape> };

const runnerMap: RunnerMap = {
  'empty-stats': async (scenarioCase) => {
    const dispatcher = createDispatcher(scenarioCase.input.dispatcher);
    const stats = dispatcher.getStats();
    assert.ok(stats instanceof Map);
    assert.equal(stats.size, scenarioCase.expected.objectKeys);
    await dispatcher.destroy();
  },
  'stats-object-after-requests': async (scenarioCase) => {
    const previous = process.env.SUBSTRATE_FETCH_TEST_TRANSPORT;
    process.env.SUBSTRATE_FETCH_TEST_TRANSPORT = '1';

    try {
      const agent = TestDispatcher.create(scenarioCase.input.dispatcher);
      const dispatcher = UndiciDispatcher.create(agent);
      const origin = 'http://127.0.0.1:41234';
      await agent.fetch(`${origin}/ok`, {});
      const stats = dispatcher.getStats();
      assert.ok(stats instanceof Map);
      assert.equal(stats.size, scenarioCase.expected.objectKeys);
      assert.ok(stats.has(origin), 'stats must key the origin that actually issued a request');
      await dispatcher.destroy();
    } finally {
      if (previous === undefined) {
        delete process.env.SUBSTRATE_FETCH_TEST_TRANSPORT;
      } else {
        process.env.SUBSTRATE_FETCH_TEST_TRANSPORT = previous;
      }
    }
  },
  'frozen-stats-object': async (scenarioCase) => {
    const dispatcher = createDispatcher(scenarioCase.input.dispatcher);
    const stats = dispatcher.getStats();
    const allValuesFrozen = [...stats.values()].every((entry) => Object.isFrozen(entry));
    assert.equal(allValuesFrozen, scenarioCase.expected.frozen);
    await dispatcher.destroy();
  },
  'deeply-frozen-stats': async (scenarioCase) => {
    const dispatcher = createDispatcher(scenarioCase.input.dispatcher);
    const stats = dispatcher.getStats();
    const allValuesFrozen = [...stats.values()].every((entry) => Object.isFrozen(entry));
    assert.equal(allValuesFrozen, scenarioCase.expected.frozen);
    await dispatcher.destroy();
  },
  'healthy-non-existent-origin': async (scenarioCase) => {
    const dispatcher = createDispatcher(scenarioCase.input.dispatcher);
    const health = dispatcher.checkDispatcherHealth(scenarioCase.input.origin);
    assert.equal(health.healthy, scenarioCase.expected.healthy);
    assert.equal(health.stats, materializeSentinel(scenarioCase.expected.stats));
    assert.equal(health.queueRatio, materializeSentinel(scenarioCase.expected.queueRatio));
    assert.equal(health.recommendation, materializeSentinel(scenarioCase.expected.recommendation));
    await dispatcher.destroy();
  },
  'healthy-new-dispatcher': async (scenarioCase) => {
    const dispatcher = createDispatcher(scenarioCase.input.dispatcher);
    const stats = dispatcher.getStats();
    assert.equal(stats.size, scenarioCase.expected.objectKeys);
    const health = dispatcher.checkDispatcherHealth(scenarioCase.input.origin);
    assert.equal(health.healthy, scenarioCase.expected.healthy);
    await dispatcher.destroy();
  },
  'health-interface-shape': async (scenarioCase) => {
    const dispatcher = createDispatcher(scenarioCase.input.dispatcher);
    const health = dispatcher.checkDispatcherHealth(scenarioCase.input.origin);
    assert.equal(typeof health.healthy, scenarioCase.expected.healthyType);
    assert.equal(matchesTypeDescriptor(health.queueRatio, scenarioCase.expected.queueRatioType), true);
    assert.equal(matchesTypeDescriptor(health.recommendation, scenarioCase.expected.recommendationType), true);
    assert.equal(matchesTypeDescriptor(health.stats, scenarioCase.expected.statsType), true);
    await dispatcher.destroy();
  },
  'test-transport-pressure': async (scenarioCase) => {
    const previous = process.env.SUBSTRATE_FETCH_TEST_TRANSPORT;
    process.env.SUBSTRATE_FETCH_TEST_TRANSPORT = '1';

    try {
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
    } finally {
      if (previous === undefined) {
        delete process.env.SUBSTRATE_FETCH_TEST_TRANSPORT;
      } else {
        process.env.SUBSTRATE_FETCH_TEST_TRANSPORT = previous;
      }
    }
  },
  'test-transport-overloaded': async (scenarioCase) => {
    const previous = process.env.SUBSTRATE_FETCH_TEST_TRANSPORT;
    process.env.SUBSTRATE_FETCH_TEST_TRANSPORT = '1';

    try {
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
    } finally {
      if (previous === undefined) {
        delete process.env.SUBSTRATE_FETCH_TEST_TRANSPORT;
      } else {
        process.env.SUBSTRATE_FETCH_TEST_TRANSPORT = previous;
      }
    }
  },
  'close-after-idle': async (scenarioCase) => {
    const dispatcher = createDispatcher(scenarioCase.input.dispatcher);
    await dispatcher.close();
    assert.equal(scenarioCase.expected.closed, true);
  },
  'destroy-with-timeout': async (scenarioCase) => {
    const dispatcher = createDispatcher(scenarioCase.input.dispatcher);
    await dispatcher.destroy(scenarioCase.input.destroy);
    assert.equal(scenarioCase.expected.destroyedAfterWait, true);
  },
  'reject-invalid-agent': async (scenarioCase) => {
    assert.throws(() => {
      Reflect.apply(UndiciDispatcher.create, UndiciDispatcher, [{}]);
    }, (error): boolean => {
      return error instanceof Error && error.message === scenarioCase.expected.message;
    });
  },
  'test-transport-delegates': async (scenarioCase) => {
    const previous = process.env.SUBSTRATE_FETCH_TEST_TRANSPORT;
    process.env.SUBSTRATE_FETCH_TEST_TRANSPORT = '1';

    try {
      const dispatcher = createDispatcher(scenarioCase.input.dispatcher);
      const health = dispatcher.checkDispatcherHealth(scenarioCase.input.origin);
      assert.equal(health.healthy, scenarioCase.expected.healthy);
      assert.equal(health.queueRatio, undefined);
      assert.equal(health.recommendation, undefined);
      assert.equal(health.stats, undefined);
      assert.equal(dispatcher.getStats().size, scenarioCase.expected.statsKeys);
      await dispatcher.close();
      await dispatcher.destroy({ timeout: 1 });
    } finally {
      if (previous === undefined) {
        delete process.env.SUBSTRATE_FETCH_TEST_TRANSPORT;
      } else {
        process.env.SUBSTRATE_FETCH_TEST_TRANSPORT = previous;
      }
    }
  },
  'structure-after-get-stats': async (scenarioCase) => {
    const dispatcher = createDispatcher(scenarioCase.input.dispatcher);
    const stats = dispatcher.getStats();
    assert.ok(stats instanceof Map);
    assert.equal(stats.size, scenarioCase.expected.objectKeys);
    const allValuesFrozen = [...stats.values()].every((entry) => Object.isFrozen(entry));
    assert.equal(allValuesFrozen, scenarioCase.expected.frozen);
    await dispatcher.destroy();
  }
};

async function runCase<Shape extends ScenarioCase['shape']>(scenarioCase: Extract<ScenarioCase, { shape: Shape }>): Promise<void> {
  await runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('dispatcher health monitoring', () => {
  for (const scenario of fileIntake(scenarioGroups).cases) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
