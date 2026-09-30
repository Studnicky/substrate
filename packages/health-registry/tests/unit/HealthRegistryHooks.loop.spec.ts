import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { RuntimeError } from '@studnicky/errors/node';
import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import timersPromises from 'node:timers/promises';

import type { HealthStatusEntity } from '../../src/entities/HealthStatusEntity.js';
import type { HealthCheckResultInterface } from '../../src/interfaces/HealthCheckResultInterface.js';

import { HealthRegistry } from '../../src/HealthRegistry.js';
import { HealthRegistryHooksScenarioCaseEntity } from './entities/HealthRegistryHooksScenarioCaseEntity.js';
import scenarioGroups from './HealthRegistryHooks.scenarios.json' with { 'type': 'json' };
import { UnhandledRejectionGuard } from './UnhandledRejectionGuard.js';

class ObservedRegistry extends HealthRegistry {
  readonly registeredCalls: string[] = [];
  readonly resultCalls: { 'name': string; 'result': HealthCheckResultInterface }[] = [];
  readonly aggregateCalls: { 'overall': HealthStatusEntity.Type; 'size': number }[] = [];
  readonly timeoutCalls: { 'name': string; 'timeoutMs': number }[] = [];

  static override create(): ObservedRegistry {
    const registry = new ObservedRegistry();
    return registry;
  }

  protected override onCheckRegistered(name: string): void {
    this.registeredCalls.push(name);
  }

  protected override onCheckResult(name: string, result: HealthCheckResultInterface): void {
    this.resultCalls.push({ 'name': name, 'result': result });
  }

  protected override onAggregate(overall: HealthStatusEntity.Type, results: ReadonlyMap<string, HealthCheckResultInterface>): void {
    this.aggregateCalls.push({ 'overall': overall, 'size': results.size });
  }

  protected override onCheckTimeout(name: string, timeoutMs: number): void {
    this.timeoutCalls.push({ 'name': name, 'timeoutMs': timeoutMs });
  }
}

class HealthRegistryHooksRunners {
  static async 'async-aggregate-rejection'(scenarioCase: ScenarioCaseOfType<HealthRegistryHooksScenarioCaseEntity.Type, 'async-aggregate-rejection'>): Promise<void> {
    const guard = new UnhandledRejectionGuard('asynchronous aggregate hook produced an unhandled rejection');
    guard.install();

    try {
      const registry = HealthRegistry.create();
      Object.defineProperty(registry, 'onAggregate', {
        'value': (): Promise<void> => {
          const rejection = Promise.resolve().then((): void => {
            throw RuntimeError.create('async aggregate boom');
          });
          return rejection;
        }
      });
      registry.register(scenarioCase.input.name, () => {
        const result = Promise.resolve({ 'status': scenarioCase.input.status });
        return result;
      });

      const evaluation = await registry.evaluate();
      assert.equal(evaluation.status, scenarioCase.expected.resultStatus);

      await timersPromises.setTimeout(scenarioCase.input.waitMs);
      await timersPromises.setImmediate();

      assert.equal(scenarioCase.expected.rejectionCount, 0);
      assert.equal(registry.hookErrorCount, scenarioCase.expected.hookErrorCount);
      assert.equal(registry.getHookErrors()[0]?.hookName, scenarioCase.expected.hookName);
    } finally {
      guard.uninstall();
    }
  }

  static 'deeply-detached-hook-errors'(scenarioCase: ScenarioCaseOfType<HealthRegistryHooksScenarioCaseEntity.Type, 'deeply-detached-hook-errors'>): void {
    const cause = RuntimeError.create(scenarioCase.input.causeMessage, { 'cause': { 'checks': scenarioCase.input.nestedChecks } });

    class ThrowingRegistrationRegistry extends HealthRegistry {
      protected override onCheckRegistered(): void {
        throw cause;
      }
    }

    const registry = ThrowingRegistrationRegistry.create();
    registry.register('database', () => {
      const healthy = Promise.resolve({ 'status': 'healthy' as const });
      return healthy;
    });

    assert.equal(registry.hookErrorCount, scenarioCase.expected.errorCount);
    const firstCause = registry.getHookErrors()[0]?.cause;
    assert.ok(firstCause instanceof Error);
    firstCause.message = 'mutated';
    const firstDetails: unknown = firstCause.cause;
    assert.ok(firstDetails !== null && typeof firstDetails === 'object');
    const firstChecks: unknown = Reflect.get(firstDetails, 'checks');
    assert.ok(Array.isArray(firstChecks));
    firstChecks.push(...scenarioCase.input.mutateChecks);

    const secondCause = registry.getHookErrors()[0]?.cause;
    assert.ok(secondCause instanceof Error);
    assert.equal(secondCause.message, scenarioCase.expected.message);
    assert.deepEqual(secondCause.cause, { 'checks': scenarioCase.expected.nestedChecks });
    assert.equal(registry.hookErrorCount, scenarioCase.expected.errorCount);
  }

  static 'hook-errors-owned-by-instance'(scenarioCase: ScenarioCaseOfType<HealthRegistryHooksScenarioCaseEntity.Type, 'hook-errors-owned-by-instance'>): void {
    class ThrowingRegistrationRegistry extends HealthRegistry {
      #cause = RuntimeError.create('unconfigured hook failure');

      static override create(): ThrowingRegistrationRegistry {
        const registry = new ThrowingRegistrationRegistry();
        return registry;
      }

      failWith(cause: RuntimeError): void {
        this.#cause = cause;
      }

      protected override onCheckRegistered(): void {
        throw this.#cause;
      }
    }

    const firstCause = RuntimeError.create(scenarioCase.input.firstCause);
    const secondCause = RuntimeError.create(scenarioCase.input.secondCause);
    const first = ThrowingRegistrationRegistry.create();
    const second = ThrowingRegistrationRegistry.create();
    first.failWith(firstCause);
    second.failWith(secondCause);

    first.register('first', () => {
      const healthy = Promise.resolve({ 'status': 'healthy' as const });
      return healthy;
    });
    second.register('second', () => {
      const healthy = Promise.resolve({ 'status': 'healthy' as const });
      return healthy;
    });

    const firstErrors = first.getHookErrors();
    const secondErrors = second.getHookErrors();
    assert.equal(first.hookErrorCount, scenarioCase.expected.errorCount);
    assert.equal(second.hookErrorCount, scenarioCase.expected.errorCount);
    assert.equal(firstErrors[0]?.hookName, scenarioCase.expected.hookName);
    assert.equal(secondErrors[0]?.hookName, scenarioCase.expected.hookName);
    assert.ok(firstErrors[0]?.cause instanceof Error);
    assert.ok(secondErrors[0]?.cause instanceof Error);
    assert.notStrictEqual(firstErrors[0].cause, firstCause);
    assert.notStrictEqual(secondErrors[0].cause, secondCause);
    assert.equal(firstErrors[0].cause.message, firstCause.message);
    assert.equal(secondErrors[0].cause.message, secondCause.message);
  }

  static async 'hook-order'(scenarioCase: ScenarioCaseOfType<HealthRegistryHooksScenarioCaseEntity.Type, 'hook-order'>): Promise<void> {
    const order: string[] = [];

    class OrderedRegistry extends HealthRegistry {
      protected override onCheckRegistered(_name: string): void { order.push('registered'); }
      protected override onCheckResult(_name: string): void { order.push('result'); }
      protected override onAggregate(): void { order.push('aggregate'); }
    }

    const registry = OrderedRegistry.create();
    registry.register(scenarioCase.input.name, () => {
      const result = Promise.resolve({ 'status': scenarioCase.input.status });
      return result;
    });
    await registry.evaluate();
    assert.deepEqual(order, scenarioCase.expected.order);
  }

  static async 'no-timeout-after-fast-result'(scenarioCase: ScenarioCaseOfType<HealthRegistryHooksScenarioCaseEntity.Type, 'no-timeout-after-fast-result'>): Promise<void> {
    const registry = ObservedRegistry.create();
    registry.register(scenarioCase.input.name, () => {
      const result = Promise.resolve({ 'status': scenarioCase.input.status });
      return result;
    }, { 'timeoutMs': scenarioCase.input.timeoutMs });
    await registry.evaluate();
    await timersPromises.setTimeout(scenarioCase.input.delayMs);
    assert.equal(registry.timeoutCalls.length, scenarioCase.expected.timeoutCount);
    assert.equal(registry.resultCalls.length, 1);
    assert.equal(registry.resultCalls[0]?.result.status, scenarioCase.expected.resultStatus);
  }

  static async 'on-aggregate-after-settle'(scenarioCase: ScenarioCaseOfType<HealthRegistryHooksScenarioCaseEntity.Type, 'on-aggregate-after-settle'>): Promise<void> {
    const registry = ObservedRegistry.create();
    await HealthRegistryHooksRunners.runCheckSet(registry, scenarioCase.input.checks);
    assert.equal(registry.aggregateCalls.length, scenarioCase.expected.aggregateCountAfterFirst);
    assert.deepEqual(registry.aggregateCalls, scenarioCase.expected.aggregateCalls);
    await registry.evaluate();
    assert.equal(registry.aggregateCalls.length, scenarioCase.expected.aggregateCountAfterSecond);
  }

  static async 'on-check-registered'(scenarioCase: ScenarioCaseOfType<HealthRegistryHooksScenarioCaseEntity.Type, 'on-check-registered'>): Promise<void> {
    const registry = ObservedRegistry.create();
    await HealthRegistryHooksRunners.runCheckSet(registry, scenarioCase.input.checks);
    assert.deepEqual(registry.registeredCalls, scenarioCase.expected.registeredCalls);
  }

  static async 'on-check-result'(scenarioCase: ScenarioCaseOfType<HealthRegistryHooksScenarioCaseEntity.Type, 'on-check-result'>): Promise<void> {
    const registry = ObservedRegistry.create();
    await HealthRegistryHooksRunners.runCheckSet(registry, scenarioCase.input.checks);
    assert.equal(registry.resultCalls.length, scenarioCase.expected.resultCalls.length);
    const resultsByName = new Map<string, HealthCheckResultInterface>();
    for (let index = 0; index < registry.resultCalls.length; index += 1) {
      const call = registry.resultCalls[index];
      if (call !== undefined && resultsByName.has(call.name) === false) {
        resultsByName.set(call.name, call.result);
      }
    }
    for (let index = 0; index < scenarioCase.expected.resultCalls.length; index += 1) {
      const expected = scenarioCase.expected.resultCalls[index];
      if (expected !== undefined) {
        const actual = resultsByName.get(expected.name);
        assert.equal(actual?.status, expected.status);
        if (expected.metadata !== undefined) {
          assert.deepEqual(actual?.metadata, expected.metadata);
        }
      }
    }
  }

  static async 'rejecting-check-result'(scenarioCase: ScenarioCaseOfType<HealthRegistryHooksScenarioCaseEntity.Type, 'rejecting-check-result'>): Promise<void> {
    const registry = ObservedRegistry.create();
    registry.register(scenarioCase.input.name, () => {
      const rejection = Promise.reject(RuntimeError.create(scenarioCase.input.errorMessage));
      return rejection;
    });
    await registry.evaluate();
    assert.equal(registry.resultCalls.length, scenarioCase.expected.resultCalls.length);
    assert.equal(registry.resultCalls[0]?.result.status, scenarioCase.expected.resultCalls[0]?.status);
  }

  static async 'throwing-on-aggregate'(scenarioCase: ScenarioCaseOfType<HealthRegistryHooksScenarioCaseEntity.Type, 'throwing-on-aggregate'>): Promise<void> {
    class ThrowingAggregateRegistry extends HealthRegistry {
      protected override onAggregate(): void {
        throw RuntimeError.create('hook boom');
      }
    }

    const registry = ThrowingAggregateRegistry.create();
    registry.register(scenarioCase.input.name, () => {
      const result = Promise.resolve({ 'status': scenarioCase.input.status });
      return result;
    });
    const evaluation = await registry.evaluate();
    assert.equal(evaluation.status, scenarioCase.expected.resultStatus);
    assert.equal(evaluation.results.get(scenarioCase.input.name)?.status, scenarioCase.expected.resultStatus);
  }

  static async 'throwing-on-check-result'(scenarioCase: ScenarioCaseOfType<HealthRegistryHooksScenarioCaseEntity.Type, 'throwing-on-check-result'>): Promise<void> {
    class ThrowingResultRegistry extends HealthRegistry {
      protected override onCheckResult(): void {
        throw RuntimeError.create('hook boom');
      }
    }

    const registry = ThrowingResultRegistry.create();
    registry.register(scenarioCase.input.name, () => {
      const result = Promise.resolve({ 'status': scenarioCase.input.status });
      return result;
    });
    const evaluation = await registry.evaluate();
    assert.equal(evaluation.status, scenarioCase.expected.resultStatus);
    assert.equal(evaluation.results.get(scenarioCase.input.name)?.status, scenarioCase.expected.resultStatus);
  }

  static async 'timeout-plus-result'(scenarioCase: ScenarioCaseOfType<HealthRegistryHooksScenarioCaseEntity.Type, 'timeout-plus-result'>): Promise<void> {
    const registry = ObservedRegistry.create();
    registry.register(scenarioCase.input.name, async () => {
      await timersPromises.setTimeout(scenarioCase.input.delayMs);
      const result = { 'status': scenarioCase.input.status };
      return result;
    }, { 'timeoutMs': scenarioCase.input.timeoutMs });

    await registry.evaluate();
    assert.equal(registry.timeoutCalls.length, scenarioCase.expected.timeoutCalls.length);
    assert.equal(registry.timeoutCalls[0]?.name, scenarioCase.expected.timeoutCalls[0]?.name);
    assert.equal(registry.timeoutCalls[0]?.timeoutMs, scenarioCase.expected.timeoutCalls[0]?.timeoutMs);
    assert.equal(registry.resultCalls.length, 1);
    assert.equal(registry.resultCalls[0]?.result.status, scenarioCase.expected.resultStatus);
  }

  private static createCheck(check: HealthCheckResultInterface): () => Promise<HealthCheckResultInterface> {
    const checkFunction = (): Promise<HealthCheckResultInterface> => {
      const result: HealthCheckResultInterface = check.metadata === undefined
        ? { 'status': check.status }
        : { 'metadata': check.metadata, 'status': check.status };
      const settled = Promise.resolve(result);
      return settled;
    };
    return checkFunction;
  }

  private static async runCheckSet(
    registry: ObservedRegistry,
    checks: readonly (HealthCheckResultInterface & { readonly 'name': string })[]
  ): Promise<void> {
    for (let index = 0; index < checks.length; index += 1) {
      const check = checks[index];
      if (check !== undefined) {
        registry.register(check.name, HealthRegistryHooksRunners.createCheck(check));
      }
    }
    await registry.evaluate();
  }
}

ScenarioSuite.register({
  'entity': HealthRegistryHooksScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'HealthRegistry lifecycle hooks',
  'runners': HealthRegistryHooksRunners
});
