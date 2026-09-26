import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import { RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { HealthRegistry } from '../../src/HealthRegistry.js';
import { HealthCheckOptionsEntity } from '../../src/entities/HealthCheckOptionsEntity.js';
import type { HealthCheckInterface } from '../../src/interfaces/HealthCheckInterface.js';
import type { HealthCheckResultInterface } from '../../src/interfaces/HealthCheckResultInterface.js';
import { HealthRegistryScenarioCaseEntity } from './entities/HealthRegistryScenarioCaseEntity.js';
import scenarioGroups from './HealthRegistry.scenarios.json' with { type: 'json' };

const fileIntake = ScenarioFileCompiler.compileIntake(HealthRegistryScenarioCaseEntity.Schema, HealthRegistryScenarioCaseEntity.Node);

function createUnhandledRejectionAssertion(message: string): () => void {
  return () => { assert.fail(message); };
}

type ScenarioCase = HealthRegistryScenarioCaseEntity.Type;
type HealthCheckDefinitionInterface = HealthRegistryScenarioCaseEntity.CheckDefinition;

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
  for (const scenario of fileIntake(scenarioGroups).cases) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
