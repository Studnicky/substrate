import { RuntimeError } from '@studnicky/errors';
import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { HealthRegistry } from '../../src/HealthRegistry.js';
import { HealthCheckOptionsEntity } from '../../src/entities/HealthCheckOptionsEntity.js';
import type { HealthCheckInterface } from '../../src/interfaces/HealthCheckInterface.js';
import type { HealthCheckResultInterface } from '../../src/interfaces/HealthCheckResultInterface.js';
import scenarioGroups from './HealthRegistry.scenarios.json' with { type: 'json' };

function createUnhandledRejectionAssertion(message: string): () => void {
  return () => { assert.fail(message); };
}

type HealthStatus = 'degraded' | 'healthy' | 'unhealthy';

interface HealthCheckDefinitionInterface {
  delayMs?: number;
  metadata?: Record<string, string>;
  name: string;
  outcome?: 'healthy' | 'late-throw' | 'throw' | 'timeout';
  status?: HealthStatus;
  timeoutMs?: number;
}

type ScenarioCase =
  | {
      description: string;
      expected: {
        resultCount: number;
        status: 'healthy';
      };
      input: {
        checks: [];
      };
      shape: 'empty-registry-healthy';
      name: string;
    }
  | {
      description: string;
      expected: {
        results: Array<{ name: string; status: 'healthy' }>;
        status: 'healthy';
      };
      input: {
        checks: HealthCheckDefinitionInterface[];
      };
      shape: 'all-healthy';
      name: string;
    }
  | {
      description: string;
      expected: {
        results: Array<{ name: string; status: 'healthy' | 'degraded' }>;
        status: 'degraded';
      };
      input: {
        checks: HealthCheckDefinitionInterface[];
      };
      shape: 'one-degraded';
      name: string;
    }
  | {
      description: string;
      expected: {
        results: Array<{ name: string; status: 'healthy' | 'degraded' | 'unhealthy' }>;
        status: 'unhealthy';
      };
      input: {
        checks: HealthCheckDefinitionInterface[];
      };
      shape: 'one-unhealthy';
      name: string;
    }
  | {
      description: string;
      expected: {
        results: Array<{ name: string; status: 'healthy' | 'unhealthy' }>;
        status: 'unhealthy';
      };
      input: {
        checks: HealthCheckDefinitionInterface[];
      };
      shape: 'rejecting-check-unhealthy';
      name: string;
    }
  | {
      description: string;
      expected: {
        resultStatus: 'unhealthy';
        status: 'unhealthy';
      };
      input: {
        checks: HealthCheckDefinitionInterface[];
      };
      shape: 'timeout-check-unhealthy';
      name: string;
    }
  | {
      description: string;
      expected: {
        rejectionEvents: number;
        resultStatus: 'unhealthy';
        status: 'unhealthy';
      };
      input: {
        checks: HealthCheckDefinitionInterface[];
      };
      shape: 'timed-out-late-rejection-owned';
      name: string;
    }
  | {
      description: string;
      expected: {
        remainingCount: number;
        status: 'healthy';
      };
      input: {
        checks: HealthCheckDefinitionInterface[];
        unregister: string;
      };
      shape: 'unregister-removes-check';
      name: string;
    }
  | {
      description: string;
      expected: {
        afterRegisterHas: true;
        afterUnregisterHas: false;
        initialHas: false;
        registeredNames: string[];
      };
      input: {
        name: string;
      };
      shape: 'has-and-list-reflect-registration';
      name: string;
    }
  | {
      description: string;
      expected: {
        status: 'healthy';
      };
      input: {
        checks: HealthCheckDefinitionInterface[];
      };
      shape: 're-register-replaces-check';
      name: string;
    };

function createHealthResult(def: HealthCheckDefinitionInterface): HealthCheckResultInterface {
  assert.ok(def.status !== undefined);
  if (def.metadata !== undefined) {
    return { status: def.status, metadata: def.metadata };
  }
  return { status: def.status };
}

function makeCheck(def: HealthCheckDefinitionInterface): HealthCheckInterface {
  if (def.status !== undefined) {
    return async () => {
      return createHealthResult(def);
    };
  }

  if (def.outcome === 'throw') {
    return async () => { throw RuntimeError.create('boom'); };
  }

  if (def.outcome === 'late-throw') {
    return async () => {
      assert.ok(def.delayMs !== undefined);
      await new Promise((resolve) => setTimeout(resolve, def.delayMs));
      throw RuntimeError.create('late health failure');
    };
  }

  return async () => {
    await new Promise((resolve) => setTimeout(resolve, def.delayMs ?? 200));
    return { status: 'healthy' as const };
  };
}

function createCheckOptions(def: HealthCheckDefinitionInterface): HealthCheckOptionsEntity.Type | undefined {
  return def.timeoutMs === undefined ? undefined : HealthCheckOptionsEntity.intake({ 'timeoutMs': def.timeoutMs });
}

type ScenarioRunner<K extends ScenarioCase['shape']> =
  (scenarioCase: Extract<ScenarioCase, { shape: K }>) => Promise<void> | void;
type RunnerMap = { [K in ScenarioCase['shape']]: ScenarioRunner<K> };

const runnerMap: RunnerMap = {
  'all-healthy': async (scenarioCase) => {
    const registry = HealthRegistry.create();
    for (const check of scenarioCase.input.checks) {
      registry.register(check.name, makeCheck(check), createCheckOptions(check));
    }
    const { results, status } = await registry.evaluate();
    assert.equal(status, scenarioCase.expected.status);
    assert.deepEqual([...results.entries()].map(([name, result]) => ({ name, status: result.status })), scenarioCase.expected.results);
  },
  'empty-registry-healthy': async (scenarioCase) => {
    const registry = HealthRegistry.create();
    const { results, status } = await registry.evaluate();
    assert.equal(status, scenarioCase.expected.status);
    assert.equal(results.size, scenarioCase.expected.resultCount);
  },
  'has-and-list-reflect-registration': (scenarioCase) => {
    const registry = HealthRegistry.create();
    assert.equal(registry.has(scenarioCase.input.name), scenarioCase.expected.initialHas);
    registry.register(scenarioCase.input.name, async () => ({ status: 'healthy' }));
    assert.equal(registry.has(scenarioCase.input.name), scenarioCase.expected.afterRegisterHas);
    assert.deepEqual(registry.list(), scenarioCase.expected.registeredNames);
    registry.unregister(scenarioCase.input.name);
    assert.equal(registry.has(scenarioCase.input.name), scenarioCase.expected.afterUnregisterHas);
    assert.deepEqual(registry.list(), []);
  },
  'one-degraded': async (scenarioCase) => {
    const registry = HealthRegistry.create();
    for (const check of scenarioCase.input.checks) {
      registry.register(check.name, makeCheck(check), createCheckOptions(check));
    }
    const { results, status } = await registry.evaluate();
    assert.equal(status, scenarioCase.expected.status);
    assert.deepEqual([...results.entries()].map(([name, result]) => ({ name, status: result.status })), scenarioCase.expected.results);
  },
  'one-unhealthy': async (scenarioCase) => {
    const registry = HealthRegistry.create();
    for (const check of scenarioCase.input.checks) {
      registry.register(check.name, makeCheck(check), createCheckOptions(check));
    }
    const { results, status } = await registry.evaluate();
    assert.equal(status, scenarioCase.expected.status);
    assert.deepEqual([...results.entries()].map(([name, result]) => ({ name, status: result.status })), scenarioCase.expected.results);
  },
  're-register-replaces-check': async (scenarioCase) => {
    const registry = HealthRegistry.create();
    for (const check of scenarioCase.input.checks) {
      registry.register(check.name, makeCheck(check), createCheckOptions(check));
    }
    const { status } = await registry.evaluate();
    assert.equal(status, scenarioCase.expected.status);
  },
  'rejecting-check-unhealthy': async (scenarioCase) => {
    const registry = HealthRegistry.create();
    for (const check of scenarioCase.input.checks) {
      registry.register(check.name, makeCheck(check), createCheckOptions(check));
    }
    const { results, status } = await registry.evaluate();
    assert.equal(status, scenarioCase.expected.status);
    assert.deepEqual([...results.entries()].map(([name, result]) => ({ name, status: result.status })), scenarioCase.expected.results);
  },
  'timeout-check-unhealthy': async (scenarioCase) => {
    const registry = HealthRegistry.create();
    for (const check of scenarioCase.input.checks) {
      registry.register(check.name, makeCheck(check), createCheckOptions(check));
    }
    const { results, status } = await registry.evaluate();
    assert.equal(status, scenarioCase.expected.status);
    assert.equal(results.get(scenarioCase.input.checks[0]?.name ?? '')?.status, scenarioCase.expected.resultStatus);
  },
  'timed-out-late-rejection-owned': async (scenarioCase) => {
    const registry = HealthRegistry.create();
    const onUnhandledRejection = createUnhandledRejectionAssertion('timed-out health check produced an unhandled rejection');
    process.on('unhandledRejection', onUnhandledRejection);

    try {
      for (const check of scenarioCase.input.checks) {
        registry.register(check.name, makeCheck(check), createCheckOptions(check));
      }
      const { results, status } = await registry.evaluate();
      assert.equal(status, scenarioCase.expected.status);
      assert.equal(results.get(scenarioCase.input.checks[0]?.name ?? '')?.status, scenarioCase.expected.resultStatus);
      await new Promise((resolve) => setTimeout(resolve, (scenarioCase.input.checks[0]?.delayMs ?? 0) + 30));
      await new Promise((resolve) => setImmediate(resolve));
      assert.equal(scenarioCase.expected.rejectionEvents, 0);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  },
  'unregister-removes-check': async (scenarioCase) => {
    const registry = HealthRegistry.create();
    for (const check of scenarioCase.input.checks) {
      registry.register(check.name, makeCheck(check), createCheckOptions(check));
    }
    registry.unregister(scenarioCase.input.unregister);
    const { results, status } = await registry.evaluate();
    assert.equal(status, scenarioCase.expected.status);
    assert.equal(results.size, scenarioCase.expected.remainingCount);
  }
};

async function runCase<K extends ScenarioCase['shape']>(scenarioCase: Extract<ScenarioCase, { shape: K }>): Promise<void> {
  await runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('HealthRegistry', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
