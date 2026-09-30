import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { RuntimeError } from '@studnicky/errors/node';
import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import timersPromises from 'node:timers/promises';

import type { HealthCheckInterface } from '../../src/interfaces/HealthCheckInterface.js';
import type { HealthCheckResultInterface } from '../../src/interfaces/HealthCheckResultInterface.js';
import type { HealthCheckDefinitionEntity } from './entities/HealthCheckDefinitionEntity.js';

import { HealthCheckOptionsEntity } from '../../src/entities/HealthCheckOptionsEntity.js';
import { HealthRegistry } from '../../src/HealthRegistry.js';
import { HealthRegistryScenarioCaseEntity } from './entities/HealthRegistryScenarioCaseEntity.js';
import scenarioGroups from './HealthRegistry.scenarios.json' with { 'type': 'json' };
import { UnhandledRejectionGuard } from './UnhandledRejectionGuard.js';

class HealthRegistryRunners {
  static async 'all-healthy'(scenarioCase: ScenarioCaseOfType<HealthRegistryScenarioCaseEntity.Type, 'all-healthy'>): Promise<void> {
    await HealthRegistryRunners.evaluateAndAssertResults(scenarioCase);
  }

  static async 'empty-registry-healthy'(scenarioCase: ScenarioCaseOfType<HealthRegistryScenarioCaseEntity.Type, 'empty-registry-healthy'>): Promise<void> {
    const registry = HealthRegistry.create();
    const { results, status } = await registry.evaluate();
    assert.equal(status, scenarioCase.expected.status);
    assert.equal(results.size, scenarioCase.expected.resultCount);
  }

  static 'has-and-list-reflect-registration'(scenarioCase: ScenarioCaseOfType<HealthRegistryScenarioCaseEntity.Type, 'has-and-list-reflect-registration'>): void {
    const registry = HealthRegistry.create();
    assert.equal(registry.has(scenarioCase.input.name), scenarioCase.expected.initialHas);
    registry.register(scenarioCase.input.name, () => {
      const healthy = Promise.resolve({ 'status': 'healthy' as const });
      return healthy;
    });
    assert.equal(registry.has(scenarioCase.input.name), scenarioCase.expected.afterRegisterHas);
    assert.deepEqual(registry.list(), scenarioCase.expected.registeredNames);
    registry.unregister(scenarioCase.input.name);
    assert.equal(registry.has(scenarioCase.input.name), scenarioCase.expected.afterUnregisterHas);
    assert.deepEqual(registry.list(), []);
  }

  static async 'one-degraded'(scenarioCase: ScenarioCaseOfType<HealthRegistryScenarioCaseEntity.Type, 'one-degraded'>): Promise<void> {
    await HealthRegistryRunners.evaluateAndAssertResults(scenarioCase);
  }

  static async 'one-unhealthy'(scenarioCase: ScenarioCaseOfType<HealthRegistryScenarioCaseEntity.Type, 'one-unhealthy'>): Promise<void> {
    await HealthRegistryRunners.evaluateAndAssertResults(scenarioCase);
  }

  static async 're-register-replaces-check'(scenarioCase: ScenarioCaseOfType<HealthRegistryScenarioCaseEntity.Type, 're-register-replaces-check'>): Promise<void> {
    const registry = HealthRegistry.create();
    HealthRegistryRunners.registerChecks(registry, scenarioCase.input.checks);
    const { status } = await registry.evaluate();
    assert.equal(status, scenarioCase.expected.status);
  }

  static async 'rejecting-check-unhealthy'(scenarioCase: ScenarioCaseOfType<HealthRegistryScenarioCaseEntity.Type, 'rejecting-check-unhealthy'>): Promise<void> {
    await HealthRegistryRunners.evaluateAndAssertResults(scenarioCase);
  }

  static async 'timed-out-late-rejection-owned'(scenarioCase: ScenarioCaseOfType<HealthRegistryScenarioCaseEntity.Type, 'timed-out-late-rejection-owned'>): Promise<void> {
    const registry = HealthRegistry.create();
    const guard = new UnhandledRejectionGuard('timed-out health check produced an unhandled rejection');
    guard.install();

    try {
      HealthRegistryRunners.registerChecks(registry, scenarioCase.input.checks);
      const { results, status } = await registry.evaluate();
      assert.equal(status, scenarioCase.expected.status);
      assert.equal(results.get(scenarioCase.input.checks[0]?.name ?? '')?.status, scenarioCase.expected.resultStatus);
      await timersPromises.setTimeout((scenarioCase.input.checks[0]?.delayMs ?? 0) + 30);
      await timersPromises.setImmediate();
      assert.equal(scenarioCase.expected.rejectionEvents, 0);
    } finally {
      guard.uninstall();
    }
  }

  static async 'timeout-check-unhealthy'(scenarioCase: ScenarioCaseOfType<HealthRegistryScenarioCaseEntity.Type, 'timeout-check-unhealthy'>): Promise<void> {
    const registry = HealthRegistry.create();
    HealthRegistryRunners.registerChecks(registry, scenarioCase.input.checks);
    const { results, status } = await registry.evaluate();
    assert.equal(status, scenarioCase.expected.status);
    assert.equal(results.get(scenarioCase.input.checks[0]?.name ?? '')?.status, scenarioCase.expected.resultStatus);
  }

  static async 'unregister-removes-check'(scenarioCase: ScenarioCaseOfType<HealthRegistryScenarioCaseEntity.Type, 'unregister-removes-check'>): Promise<void> {
    const registry = HealthRegistry.create();
    HealthRegistryRunners.registerChecks(registry, scenarioCase.input.checks);
    registry.unregister(scenarioCase.input.unregister);
    const { results, status } = await registry.evaluate();
    assert.equal(status, scenarioCase.expected.status);
    assert.equal(results.size, scenarioCase.expected.remainingCount);
  }

  private static createCheck(definition: HealthCheckDefinitionEntity.Type): HealthCheckInterface {
    if (definition.status !== undefined) {
      return () => {
        const result = Promise.resolve(HealthRegistryRunners.createHealthResult(definition));
        return result;
      };
    }

    if (definition.outcome === 'throw') {
      return () => {
        const rejection = Promise.reject(RuntimeError.create('boom'));
        return rejection;
      };
    }

    if (definition.outcome === 'late-throw') {
      return async () => {
        assert.ok(definition.delayMs !== undefined);
        await timersPromises.setTimeout(definition.delayMs);
        throw RuntimeError.create('late health failure');
      };
    }

    return async () => {
      await timersPromises.setTimeout(definition.delayMs ?? 200);
      const result: HealthCheckResultInterface = { 'status': 'healthy' };
      return result;
    };
  }

  private static createCheckOptions(definition: HealthCheckDefinitionEntity.Type): HealthCheckOptionsEntity.Type | undefined {
    const options = definition.timeoutMs === undefined ? undefined : HealthCheckOptionsEntity.intake({ 'timeoutMs': definition.timeoutMs });
    return options;
  }

  private static createHealthResult(definition: HealthCheckDefinitionEntity.Type): HealthCheckResultInterface {
    assert.ok(definition.status !== undefined);
    if (definition.metadata !== undefined) {
      return { 'metadata': definition.metadata, 'status': definition.status };
    }
    return { 'status': definition.status };
  }

  private static async evaluateAndAssertResults(
    scenarioCase: ScenarioCaseOfType<HealthRegistryScenarioCaseEntity.Type, 'all-healthy' | 'one-degraded' | 'one-unhealthy' | 'rejecting-check-unhealthy'>
  ): Promise<void> {
    const registry = HealthRegistry.create();
    HealthRegistryRunners.registerChecks(registry, scenarioCase.input.checks);
    const { results, status } = await registry.evaluate();
    assert.equal(status, scenarioCase.expected.status);
    const summary: { 'name': string; 'status': HealthCheckResultInterface['status'] }[] = [];
    for (const [name, result] of results) {
      summary.push({ 'name': name, 'status': result.status });
    }
    assert.deepEqual(summary, scenarioCase.expected.results);
  }

  private static registerChecks(registry: HealthRegistry, checks: readonly HealthCheckDefinitionEntity.Type[]): void {
    for (let index = 0; index < checks.length; index += 1) {
      const check = checks[index];
      if (check !== undefined) {
        registry.register(check.name, HealthRegistryRunners.createCheck(check), HealthRegistryRunners.createCheckOptions(check));
      }
    }
  }
}

ScenarioSuite.register({
  'entity': HealthRegistryScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'HealthRegistry',
  'runners': HealthRegistryRunners
});
