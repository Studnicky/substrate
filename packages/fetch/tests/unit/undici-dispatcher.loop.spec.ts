import assert from 'node:assert/strict';
import { Agent } from 'undici';
import { describe, it } from 'node:test';

import { ConfigurationError } from '../../src/errors/index.js';
import { UndiciDispatcher } from '../../src/modules/UndiciDispatcher.js';
import { TestDispatcher } from '../../src/testing/TestDispatcher.js';

import scenarioGroups from './undici-dispatcher.scenarios.json' with { type: 'json' };

type ScenarioCase =
  | {
      description: string;
      expected: { shape: 'throws'; message: string };
      input: { agent: unknown };
      shape: 'constructor-invalid-agent';
      name: string;
    }
  | {
      description: string;
      expected: { shape: 'healthy' };
      input: { stats: Record<string, unknown>; origin: string };
      shape: 'health-no-stats';
      name: string;
    }
  | {
      description: string;
      expected: { shape: 'healthy' };
      input: { stats: Record<string, unknown>; origin: string };
      shape: 'health-invalid-stats';
      name: string;
    }
  | {
      description: string;
      expected: { shape: 'health'; healthy: boolean; recommendationIncludes?: string };
      input: { stats: { connected: number; pending: number }; origin: string };
      shape: 'health-pressure';
      name: string;
    }
  | {
      description: string;
      expected: { shape: 'health'; healthy: boolean; recommendationIncludes?: string };
      input: { stats: { connected: number; pending: number }; origin: string };
      shape: 'health-overload';
      name: string;
    }
  | {
      description: string;
      expected: { shape: 'health'; healthy: boolean; recommendationIncludes?: string };
      input: { stats: { connected: number; pending: number }; origin: string };
      shape: 'health-ok';
      name: string;
    }
  | {
      description: string;
      expected: { shape: 'frozen' };
      input: { stats: Record<string, { connected: number; pending: number }>; origin: string };
      shape: 'get-stats-freeze';
      name: string;
    }
  | {
      description: string;
      expected: { shape: 'called' };
      input: { agent?: ConstructorParameters<typeof Agent>[0]; timeout?: number };
      shape: 'close-agent';
      name: string;
    }
  | {
      description: string;
      expected: { shape: 'called' };
      input: { agent?: ConstructorParameters<typeof Agent>[0]; timeout?: number };
      shape: 'destroy-agent';
      name: string;
    }
  | {
      description: string;
      expected: { shape: 'called' };
      input: { agent?: ConstructorParameters<typeof Agent>[0]; timeout?: number };
      shape: 'destroy-agent-delay';
      name: string;
    }
  | {
      description: string;
      expected: { shape: 'called' };
      input: { agent?: ConstructorParameters<typeof Agent>[0]; timeout?: number };
      shape: 'destroy-agent-zero';
      name: string;
    }
  | {
      description: string;
      expected: { shape: 'healthy' };
      input: { origin: string; testDispatcher: Parameters<typeof TestDispatcher.create>[0] };
      shape: 'test-dispatcher-health';
      name: string;
    }
  | {
      description: string;
      expected: { shape: 'called' };
      input: { testDispatcher: Parameters<typeof TestDispatcher.create>[0] };
      shape: 'test-dispatcher-close';
      name: string;
    }
  | {
      description: string;
      expected: { shape: 'called' };
      input: { testDispatcher: Parameters<typeof TestDispatcher.create>[0] };
      shape: 'test-dispatcher-destroy';
      name: string;
    };

type ScenarioRunner<Shape extends ScenarioCase['shape']> = (scenarioCase: Extract<ScenarioCase, { shape: Shape }>) => Promise<void>;
type RunnerMap = { [Shape in ScenarioCase['shape']]: ScenarioRunner<Shape> };
type HealthScenario = Extract<ScenarioCase, { shape: 'health-ok' | 'health-overload' | 'health-pressure' }>;
type AgentOperationScenario = Extract<ScenarioCase, { shape: 'close-agent' | 'destroy-agent' | 'destroy-agent-delay' | 'destroy-agent-zero' }>;
type TestDispatcherScenario = Extract<ScenarioCase, { shape: 'test-dispatcher-close' | 'test-dispatcher-destroy' | 'test-dispatcher-health' }>;
type AgentCallCounts = {
  closeCalls: number;
  destroyCalls: number;
};

function createAgentWithStats(stats: Record<string, unknown>): Agent {
  const agent = new Agent({});
  Object.defineProperty(agent, 'stats', {
    'configurable': true,
    'get': () => { return stats; }
  });
  return agent;
}

function createDispatcherWithStats(stats: Record<string, unknown>): UndiciDispatcher {
  return UndiciDispatcher.create(createAgentWithStats(stats));
}

function createSpyDispatcher(scenarioCase: AgentOperationScenario): {
  calls: AgentCallCounts;
  dispatcher: UndiciDispatcher;
} {
  const calls = {
    closeCalls: 0,
    destroyCalls: 0
  };
  const agent = new Agent(scenarioCase.input.agent ?? {});
  Object.defineProperty(agent, 'close', {
    'configurable': true,
    'value': async (): Promise<void> => {
      calls.closeCalls += 1;
    }
  });
  Object.defineProperty(agent, 'destroy', {
    'configurable': true,
    'value': async (): Promise<void> => {
      calls.destroyCalls += 1;
    }
  });

  return {
    calls,
    dispatcher: UndiciDispatcher.create(agent)
  };
}

function createTestUndiciDispatcher(scenarioCase: TestDispatcherScenario): UndiciDispatcher {
  const agent = TestDispatcher.create(scenarioCase.input.testDispatcher);
  return UndiciDispatcher.create(agent);
}

async function runHealthScenario(scenarioCase: HealthScenario): Promise<void> {
  const dispatcher = createDispatcherWithStats({ [scenarioCase.input.origin]: scenarioCase.input.stats });
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

const runnerMap: RunnerMap = {
  'close-agent': async (scenarioCase) => {
    const { calls, dispatcher } = createSpyDispatcher(scenarioCase);
    await dispatcher.close();
    assert.equal(calls.closeCalls, 1);
  },
  'constructor-invalid-agent': async (scenarioCase) => {
    assert.throws(() => {
      UndiciDispatcher.create(scenarioCase.input.agent as never);
    }, (error: Error) => {
      assert.ok(error instanceof ConfigurationError);
      assert.equal(error.message, scenarioCase.expected.message);
      return true;
    });
  },
  'destroy-agent': async (scenarioCase) => {
    const { calls, dispatcher } = createSpyDispatcher(scenarioCase);
    await dispatcher.destroy(scenarioCase.input.timeout === undefined ? undefined : { 'timeout': scenarioCase.input.timeout });
    assert.equal(calls.destroyCalls, 1);
  },
  'destroy-agent-delay': async (scenarioCase) => {
    const { calls, dispatcher } = createSpyDispatcher(scenarioCase);
    const configuredTimeout = scenarioCase.input.timeout ?? 1;
    const originalSetTimeout = globalThis.setTimeout;
    let capturedMs: number | undefined;
    let releaseTimer: (() => void) | undefined;

    // Spy on the global timer instead of waiting on the wall clock: RaceTimeout.wait
    // schedules a real setTimeout, so capturing its arguments and controlling
    // when it fires proves the destroy call is actually gated behind it,
    // deterministically and without any real wait.
    Object.defineProperty(globalThis, 'setTimeout', {
      'configurable': true,
      'value': (handler: () => void, ms?: number) => {
        capturedMs = ms;
        releaseTimer = handler;
        return 0;
      }
    });

    try {
      const destroyPromise = dispatcher.destroy({ 'timeout': configuredTimeout });
      assert.equal(capturedMs, configuredTimeout, 'destroy must schedule the delay for the configured timeout');
      assert.equal(calls.destroyCalls, 0, 'agent.destroy must not run before the configured delay elapses');
      assert.equal(typeof releaseTimer, 'function');
      releaseTimer?.();
      await destroyPromise;
      assert.equal(calls.destroyCalls, 1);
    } finally {
      Object.defineProperty(globalThis, 'setTimeout', {
        'configurable': true,
        'value': originalSetTimeout
      });
    }
  },
  'destroy-agent-zero': async (scenarioCase) => {
    const { calls, dispatcher } = createSpyDispatcher(scenarioCase);
    await dispatcher.destroy({ 'timeout': 0 });
    assert.equal(calls.destroyCalls, 1);
  },
  'get-stats-freeze': async (scenarioCase) => {
    const dispatcher = createDispatcherWithStats(scenarioCase.input.stats);
    const stats = dispatcher.getStats();
    assert.equal(Object.isFrozen(stats), true);
    assert.equal(Object.isFrozen(stats[scenarioCase.input.origin] as object), true);
  },
  'health-invalid-stats': async (scenarioCase) => {
    const dispatcher = createDispatcherWithStats(scenarioCase.input.stats);
    const health = dispatcher.checkDispatcherHealth(scenarioCase.input.origin);
    assert.deepStrictEqual(health, { 'healthy': true });
  },
  'health-no-stats': async (scenarioCase) => {
    const dispatcher = createDispatcherWithStats({});
    const health = dispatcher.checkDispatcherHealth(scenarioCase.input.origin);
    assert.deepStrictEqual(health, { 'healthy': true });
  },
  'health-ok': runHealthScenario,
  'health-overload': runHealthScenario,
  'health-pressure': runHealthScenario,
  'test-dispatcher-close': async (scenarioCase) => {
    const dispatcher = createTestUndiciDispatcher(scenarioCase);
    await dispatcher.close();
    assert.equal(dispatcher instanceof UndiciDispatcher, true);
  },
  'test-dispatcher-destroy': async (scenarioCase) => {
    const dispatcher = createTestUndiciDispatcher(scenarioCase);
    await dispatcher.destroy();
    assert.equal(dispatcher instanceof UndiciDispatcher, true);
  },
  'test-dispatcher-health': async (scenarioCase) => {
    const dispatcher = createTestUndiciDispatcher(scenarioCase);
    const health = dispatcher.checkDispatcherHealth(scenarioCase.input.origin);
    assert.equal(typeof health.healthy, 'boolean');
  }
};

async function runCase<Shape extends ScenarioCase['shape']>(scenarioCase: Extract<ScenarioCase, { shape: Shape }>): Promise<void> {
  await runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('undici dispatcher', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
