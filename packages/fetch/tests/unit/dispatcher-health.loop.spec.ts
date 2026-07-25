import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DispatcherAgent } from '../../src/config/DispatcherAgent.js';
import { UndiciDispatcher } from '../../src/modules/UndiciDispatcher.js';
import { TestDispatcher } from '../../src/testing/TestDispatcher.js';
import scenarioGroups from './dispatcher-health.scenarios.json';

type ScenarioCase =
  | {
      description: string;
      expected: { frozen: false; objectKeys: number };
      input: { dispatcher: { connections: number } };
      shape: 'empty-stats' | 'stats-object-after-requests' | 'structure-after-get-stats';
      name: string;
    }
  | {
      description: string;
      expected: { frozen: true };
      input: { dispatcher: { connections: number } };
      shape: 'frozen-stats-object' | 'deeply-frozen-stats';
      name: string;
    }
  | {
      description: string;
      expected: { healthy: true; queueRatio: '__UNDEFINED__'; recommendation: '__UNDEFINED__'; stats: '__UNDEFINED__' };
      input: { dispatcher: { connections: number }; origin: string };
      shape: 'healthy-non-existent-origin';
      name: string;
    }
  | {
      description: string;
      expected: { healthy: true; objectKeys: number };
      input: { dispatcher: { connections: number }; origin: string };
      shape: 'healthy-new-dispatcher';
      name: string;
    }
  | {
      description: string;
      expected: { healthy: boolean; queueRatio: number; recommendationIncludes: string };
      input: { origin: string; path: string; queuedPath?: string; testDispatcher: { connections: number; enabled: boolean } };
      shape: 'test-transport-overloaded' | 'test-transport-pressure';
      name: string;
    }
  | {
      description: string;
      expected: { healthyType: 'boolean'; queueRatioType: 'number-or-undefined'; recommendationType: 'string-or-undefined'; statsType: 'object-or-undefined' };
      input: { dispatcher: { connections: number }; origin: string };
      shape: 'health-interface-shape';
      name: string;
    }
  | {
      description: string;
      expected: { closed: true };
      input: { dispatcher: { connections: number } };
      shape: 'close-after-idle';
      name: string;
    }
  | {
      description: string;
      expected: { destroyedAfterWait: true };
      input: { destroy: { timeout: number }; dispatcher: { connections: number } };
      shape: 'destroy-with-timeout';
      name: string;
    }
  | {
      description: string;
      expected: { message: string };
      input: Record<string, never>;
      shape: 'reject-invalid-agent';
      name: string;
    }
  | {
      description: string;
      expected: { healthy: true; statsKeys: number };
      input: { dispatcher: { connections: number }; origin: string };
      shape: 'test-transport-delegates';
      name: string;
    };

function createDispatcher(config: { connections: number }): UndiciDispatcher {
  const agent = DispatcherAgent.create(config);
  return UndiciDispatcher.create(agent);
}

function matchesTypeDescriptor(value: unknown, descriptor: string): boolean {
  const orUndefinedSuffix = '-or-undefined';
  if (descriptor.endsWith(orUndefinedSuffix)) {
    const base = descriptor.slice(0, -orUndefinedSuffix.length);
    return value === undefined || typeof value === base;
  }
  return typeof value === descriptor;
}

const runnerMap: Record<ScenarioCase['shape'], (scenarioCase: ScenarioCase) => Promise<void>> = {
  'empty-stats': async (scenarioCase) => {
    const dispatcher = createDispatcher(scenarioCase.input.dispatcher);
    const stats = dispatcher.getStats();
    assert.equal(typeof stats, 'object');
    assert.equal(Object.keys(stats).length, scenarioCase.expected.objectKeys);
    assert.equal(Object.isFrozen(stats), true);
    await dispatcher.destroy();
  },
  'stats-object-after-requests': async (scenarioCase) => {
    const dispatcher = createDispatcher(scenarioCase.input.dispatcher);
    const stats = dispatcher.getStats();
    assert.equal(typeof stats, 'object');
    assert.equal(Object.keys(stats).length, scenarioCase.expected.objectKeys);
    assert.equal(Object.isFrozen(stats), true);
    await dispatcher.destroy();
  },
  'frozen-stats-object': async (scenarioCase) => {
    const dispatcher = createDispatcher(scenarioCase.input.dispatcher);
    const stats = dispatcher.getStats();
    assert.ok(Object.isFrozen(stats));
    assert.throws(() => {
      Object.assign(stats, { 'new-origin': { test: 'value' } });
    }, TypeError);
    assert.equal(Object.isFrozen(stats), scenarioCase.expected.frozen);
    await dispatcher.destroy();
  },
  'deeply-frozen-stats': async (scenarioCase) => {
    const dispatcher = createDispatcher(scenarioCase.input.dispatcher);
    const stats = dispatcher.getStats();
    assert.ok(Object.isFrozen(stats));
    const attemptMutation = (): void => {
      Object.assign(stats, { test: 'value' });
    };
    assert.throws(attemptMutation, TypeError);
    assert.equal(Object.isFrozen(stats), scenarioCase.expected.frozen);
    await dispatcher.destroy();
  },
  'healthy-non-existent-origin': async (scenarioCase) => {
    const dispatcher = createDispatcher(scenarioCase.input.dispatcher);
    const health = dispatcher.checkDispatcherHealth(scenarioCase.input.origin);
    assert.equal(health.healthy, scenarioCase.expected.healthy);
    assert.equal(health.stats, undefined);
    assert.equal(health.queueRatio, undefined);
    assert.equal(health.recommendation, undefined);
    await dispatcher.destroy();
  },
  'healthy-new-dispatcher': async (scenarioCase) => {
    const dispatcher = createDispatcher(scenarioCase.input.dispatcher);
    const stats = dispatcher.getStats();
    assert.equal(Object.keys(stats).length, scenarioCase.expected.objectKeys);
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
    }, (error: unknown): boolean => {
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
      assert.equal(Object.keys(dispatcher.getStats()).length, scenarioCase.expected.statsKeys);
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
    assert.equal(typeof stats, 'object');
    assert.ok(Object.isFrozen(stats));
    assert.equal(Object.keys(stats).length, scenarioCase.expected.objectKeys);
    assert.equal(Object.isFrozen(stats), true);
    await dispatcher.destroy();
  }
};

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  await runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('dispatcher health monitoring', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
