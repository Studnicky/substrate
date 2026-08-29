import { RuntimeError } from '@studnicky/errors';
import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { HealthRegistry } from '../../src/HealthRegistry.js';
import type { HealthStatusEntity } from '../../src/entities/HealthStatusEntity.js';
import type { HealthCheckResultInterface } from '../../src/interfaces/HealthCheckResultInterface.js';
import scenarioGroups from './HealthRegistryHooks.scenarios.json' with { type: 'json' };

function createUnhandledRejectionAssertion(message: string): () => void {
  return () => { assert.fail(message); };
}

type ScenarioCase =
  | {
      description: string;
      expected: { registeredCalls: string[] };
      input: { checks: Array<{ name: string; status: HealthStatusEntity.Type }> };
      shape: 'on-check-registered';
      name: string;
    }
  | {
      description: string;
      expected: { resultCalls: Array<{ metadata?: unknown; name: string; status: HealthStatusEntity.Type }> };
      input: { checks: Array<{ metadata?: unknown; name: string; status: HealthStatusEntity.Type }> };
      shape: 'on-check-result';
      name: string;
    }
  | {
      description: string;
      expected: { resultCalls: Array<{ name: string; status: 'unhealthy' }> };
      input: { errorMessage: string; name: string };
      shape: 'rejecting-check-result';
      name: string;
    }
  | {
      description: string;
      expected: { resultStatus: 'unhealthy'; timeoutCalls: Array<{ name: string; timeoutMs: number }> };
      input: { delayMs: number; name: string; status: 'healthy'; timeoutMs: number };
      shape: 'timeout-plus-result';
      name: string;
    }
  | {
      description: string;
      expected: { resultStatus: 'healthy'; timeoutCount: 0 };
      input: { delayMs: number; name: string; status: 'healthy'; timeoutMs: number };
      shape: 'no-timeout-after-fast-result';
      name: string;
    }
  | {
      description: string;
      expected: {
        aggregateCalls: Array<{ overall: HealthStatusEntity.Type; size: number }>;
        aggregateCountAfterFirst: number;
        aggregateCountAfterSecond: number;
      };
      input: { checks: Array<{ name: string; status: HealthStatusEntity.Type }> };
      shape: 'on-aggregate-after-settle';
      name: string;
    }
  | {
      description: string;
      expected: { order: string[] };
      input: { name: string; status: 'healthy' };
      shape: 'hook-order';
      name: string;
    }
  | {
      description: string;
      expected: { resultStatus: 'healthy' };
      input: { name: string; status: 'healthy' };
      shape: 'throwing-on-check-result';
      name: string;
    }
  | {
      description: string;
      expected: { resultStatus: 'degraded' };
      input: { name: string; status: 'degraded' };
      shape: 'throwing-on-aggregate';
      name: string;
    }
  | {
      description: string;
      expected: { errorCount: 1; hookName: 'onCheckRegistered' };
      input: { firstCause: string; secondCause: string };
      shape: 'hook-errors-owned-by-instance';
      name: string;
    }
  | {
      description: string;
      expected: { errorCount: 1; message: string; nestedChecks: string[] };
      input: { causeMessage: string; mutateChecks: string[]; nestedChecks: string[] };
      shape: 'deeply-detached-hook-errors';
      name: string;
    }
  | {
      description: string;
      expected: { hookErrorCount: 1; hookName: 'onAggregate'; rejectionCount: 0; resultStatus: 'healthy' };
      input: { name: string; status: 'healthy'; waitMs: number };
      shape: 'async-aggregate-rejection';
      name: string;
    };

class ObservedRegistry extends HealthRegistry {
  readonly registeredCalls: string[] = [];
  readonly resultCalls: { name: string; result: HealthCheckResultInterface }[] = [];
  readonly aggregateCalls: { overall: HealthStatusEntity.Type; size: number }[] = [];
  readonly timeoutCalls: { name: string; timeoutMs: number }[] = [];

  protected override onCheckRegistered(name: string): void {
    this.registeredCalls.push(name);
  }

  protected override onCheckResult(name: string, result: HealthCheckResultInterface): void {
    this.resultCalls.push({ name, result });
  }

  protected override onAggregate(overall: HealthStatusEntity.Type, results: ReadonlyMap<string, HealthCheckResultInterface>): void {
    this.aggregateCalls.push({ overall, size: results.size });
  }

  protected override onCheckTimeout(name: string, timeoutMs: number): void {
    this.timeoutCalls.push({ name, timeoutMs });
  }
}

async function runCheckSet(
  registry: ObservedRegistry,
  checks: Array<HealthCheckResultInterface & { name: string }>
): Promise<void> {
  for (const check of checks) {
    registry.register(check.name, async () => {
      return check.metadata === undefined
        ? { status: check.status }
        : { metadata: check.metadata, status: check.status };
    });
  }
  await registry.evaluate();
}

type ScenarioRunner<K extends ScenarioCase['shape']> =
  (scenarioCase: Extract<ScenarioCase, { shape: K }>) => Promise<void>;
type RunnerMap = { [K in ScenarioCase['shape']]: ScenarioRunner<K> };

const runnerMap: RunnerMap = {
    'async-aggregate-rejection': async (scenarioCase) => {
      class AsyncRejectingAggregateRegistry extends HealthRegistry {
        protected override async onAggregate(): Promise<void> {
          await Promise.resolve();
          throw RuntimeError.create('async aggregate boom');
        }
      }

    const onUnhandledRejection = createUnhandledRejectionAssertion('asynchronous aggregate hook produced an unhandled rejection');
      process.on('unhandledRejection', onUnhandledRejection);

      try {
        const registry = AsyncRejectingAggregateRegistry.create();
        registry.register(scenarioCase.input.name, async () => ({ status: scenarioCase.input.status }));

        const evaluation = await registry.evaluate();
        assert.equal(evaluation.status, scenarioCase.expected.resultStatus);

        await new Promise((resolve) => setTimeout(resolve, scenarioCase.input.waitMs));
        await new Promise((resolve) => setImmediate(resolve));

        assert.equal(scenarioCase.expected.rejectionCount, 0);
        assert.equal(registry.hookErrorCount, scenarioCase.expected.hookErrorCount);
        assert.equal(registry.getHookErrors()[0]?.hookName, scenarioCase.expected.hookName);
      } finally {
        process.off('unhandledRejection', onUnhandledRejection);
      }
    },
    'deeply-detached-hook-errors': async (scenarioCase) => {
      const cause = RuntimeError.create(scenarioCase.input.causeMessage, { cause: { checks: scenarioCase.input.nestedChecks } });

      class ThrowingRegistrationRegistry extends HealthRegistry {
        protected override onCheckRegistered(): void {
          throw cause;
        }
      }

      const registry = ThrowingRegistrationRegistry.create();
      registry.register('database', async () => ({ status: 'healthy' }));

      assert.equal(registry.hookErrorCount, scenarioCase.expected.errorCount);
      const firstCause = registry.getHookErrors()[0]?.cause;
      assert.ok(firstCause instanceof Error);
      firstCause.message = 'mutated';
      const firstDetails = firstCause.cause;
      assert.ok(firstDetails !== null && typeof firstDetails === 'object');
      const firstChecks = Reflect.get(firstDetails, 'checks');
      assert.ok(Array.isArray(firstChecks));
      firstChecks.push(...scenarioCase.input.mutateChecks);

      const secondCause = registry.getHookErrors()[0]?.cause;
      assert.ok(secondCause instanceof Error);
      assert.equal(secondCause.message, scenarioCase.expected.message);
      assert.deepEqual(secondCause.cause, { checks: scenarioCase.expected.nestedChecks });
      assert.equal(registry.hookErrorCount, scenarioCase.expected.errorCount);
    },
    'hook-errors-owned-by-instance': async (scenarioCase) => {
      class ThrowingRegistrationRegistry extends HealthRegistry {
        #cause = RuntimeError.create('unconfigured hook failure');

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

      first.register('first', async () => ({ status: 'healthy' }));
      second.register('second', async () => ({ status: 'healthy' }));

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
    },
    'hook-order': async (scenarioCase) => {
      const order: string[] = [];

      class OrderedRegistry extends HealthRegistry {
        protected override onCheckRegistered(_name: string): void { order.push('registered'); }
        protected override onCheckResult(_name: string): void { order.push('result'); }
        protected override onAggregate(): void { order.push('aggregate'); }
      }

      const registry = OrderedRegistry.create();
      registry.register(scenarioCase.input.name, async () => ({ status: scenarioCase.input.status }));
      await registry.evaluate();
      assert.deepEqual(order, scenarioCase.expected.order);
    },
    'no-timeout-after-fast-result': async (scenarioCase) => {
      const registry = ObservedRegistry.create();
      registry.register(scenarioCase.input.name, async () => ({ status: scenarioCase.input.status }), { timeoutMs: scenarioCase.input.timeoutMs });
      await registry.evaluate()
        .then(() => new Promise((resolve) => setTimeout(resolve, scenarioCase.input.delayMs)))
        .then(() => {
          assert.equal(registry.timeoutCalls.length, scenarioCase.expected.timeoutCount);
          assert.equal(registry.resultCalls.length, 1);
          assert.equal(registry.resultCalls[0]?.result.status, scenarioCase.expected.resultStatus);
        });
    },
    'on-aggregate-after-settle': async (scenarioCase) => {
      const registry = ObservedRegistry.create();
      await runCheckSet(registry, scenarioCase.input.checks);
      assert.equal(registry.aggregateCalls.length, scenarioCase.expected.aggregateCountAfterFirst);
      assert.deepEqual(registry.aggregateCalls, scenarioCase.expected.aggregateCalls);
      await registry.evaluate();
      assert.equal(registry.aggregateCalls.length, scenarioCase.expected.aggregateCountAfterSecond);
    },
    'on-check-registered': async (scenarioCase) => {
      const registry = ObservedRegistry.create();
      await runCheckSet(registry, scenarioCase.input.checks);
      assert.deepEqual(registry.registeredCalls, scenarioCase.expected.registeredCalls);
    },
    'on-check-result': async (scenarioCase) => {
      const registry = ObservedRegistry.create();
      await runCheckSet(registry, scenarioCase.input.checks);
      assert.equal(registry.resultCalls.length, scenarioCase.expected.resultCalls.length);
      for (const expected of scenarioCase.expected.resultCalls) {
        const actual = registry.resultCalls.find((entry) => entry.name === expected.name);
        assert.equal(actual?.result.status, expected.status);
        if (expected.metadata !== undefined) {
          assert.deepEqual(actual?.result.metadata, expected.metadata);
        }
      }
    },
    'rejecting-check-result': async (scenarioCase) => {
      const registry = ObservedRegistry.create();
      registry.register(scenarioCase.input.name, async () => {
        throw RuntimeError.create(scenarioCase.input.errorMessage);
      });
      await registry.evaluate();
      assert.equal(registry.resultCalls.length, scenarioCase.expected.resultCalls.length);
      assert.equal(registry.resultCalls[0]?.result.status, scenarioCase.expected.resultCalls[0]?.status);
    },
    'throwing-on-aggregate': async (scenarioCase) => {
      class ThrowingAggregateRegistry extends HealthRegistry {
        protected override onAggregate(): void {
          throw RuntimeError.create('hook boom');
        }
      }

      const registry = ThrowingAggregateRegistry.create();
      registry.register(scenarioCase.input.name, async () => ({ status: scenarioCase.input.status }));
      return registry.evaluate().then((evaluation) => {
        assert.equal(evaluation.status, scenarioCase.expected.resultStatus);
        assert.equal(evaluation.results.get(scenarioCase.input.name)?.status, scenarioCase.expected.resultStatus);
      });
    },
    'throwing-on-check-result': async (scenarioCase) => {
      class ThrowingResultRegistry extends HealthRegistry {
        protected override onCheckResult(): void {
          throw RuntimeError.create('hook boom');
        }
      }

      const registry = ThrowingResultRegistry.create();
      registry.register(scenarioCase.input.name, async () => ({ status: scenarioCase.input.status }));
      return registry.evaluate().then((evaluation) => {
        assert.equal(evaluation.status, scenarioCase.expected.resultStatus);
        assert.equal(evaluation.results.get(scenarioCase.input.name)?.status, scenarioCase.expected.resultStatus);
      });
    },
    'timeout-plus-result': async (scenarioCase) => {
      const registry = ObservedRegistry.create();
      registry.register(scenarioCase.input.name, async () => {
        await new Promise((resolve) => setTimeout(resolve, scenarioCase.input.delayMs));
        return { status: scenarioCase.input.status };
      }, { timeoutMs: scenarioCase.input.timeoutMs });

      await registry.evaluate().then(() => {
        assert.equal(registry.timeoutCalls.length, scenarioCase.expected.timeoutCalls.length);
        assert.equal(registry.timeoutCalls[0]?.name, scenarioCase.expected.timeoutCalls[0]?.name);
        assert.equal(registry.timeoutCalls[0]?.timeoutMs, scenarioCase.expected.timeoutCalls[0]?.timeoutMs);
        assert.equal(registry.resultCalls.length, 1);
        assert.equal(registry.resultCalls[0]?.result.status, scenarioCase.expected.resultStatus);
      });
    }
};

function runCase<K extends ScenarioCase['shape']>(scenarioCase: Extract<ScenarioCase, { shape: K }>): Promise<void> {
  return runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('HealthRegistry lifecycle hooks', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
