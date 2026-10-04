import { Signal } from '@studnicky/signal/node';
import assert from 'node:assert/strict';
import { it } from 'node:test';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import type { WorkerPoolConfigInterface } from '../../../src/worker/interfaces/WorkerPoolConfigInterface.js';

import { ScenarioSuite } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { WorkerPoolConfigEntity } from '../../../src/worker/entities/WorkerPoolConfigEntity.js';
import { WorkerPool, WorkerPoolError } from '../../../src/worker/node/index.js';
import { WorkerFixturePath } from '../../helpers/worker/WorkerFixturePath.js';
import scenarioGroups from './creation.scenarios.json' with { 'type': 'json' };
import { CreationScenarioCaseEntity } from './entities/CreationScenarioCaseEntity.js';

class CreationSupport {
  static resolveWorkerPath(relativePath: string): string {
    const absolutePath = WorkerFixturePath.resolveFromModule(relativePath, import.meta.url);
    return absolutePath;
  }

  static resolvePoolConfig(
    config: CreationScenarioCaseEntity.Type['input']['workerPool']
  ): WorkerPoolConfigInterface {
    const resolved: WorkerPoolConfigInterface = {
      'workerPath':
        config.workerPath.length === 0
          ? config.workerPath
          : CreationSupport.resolveWorkerPath(config.workerPath)
    };
    if (config.batch?.concurrency !== undefined) {
      resolved.batchConcurrency = config.batch.concurrency;
    }
    if (config.concurrency !== undefined) {
      resolved.concurrency = config.concurrency;
    }
    if (config.timeoutMs !== undefined) {
      resolved.timeoutMs = config.timeoutMs;
    }
    return resolved;
  }

  static resolveRequiredPoolConfig(
    config: CreationScenarioCaseEntity.Type['input']['workerPool']
  ): WorkerPoolConfigInterface & {
    'batchConcurrency': number;
    'concurrency': number;
  } {
    if (config.batch?.concurrency === undefined || config.concurrency === undefined) {
      throw new WorkerPoolError({
        'code': 'workerPool.invalidForeignConstructionScenario',
        'message':
          'foreign-construction scenario input.workerPool requires batch.concurrency and concurrency'
      });
    }
    const result = {
      ...CreationSupport.resolvePoolConfig(config),
      'batchConcurrency': config.batch.concurrency,
      'concurrency': config.concurrency
    };
    return result;
  }

  static requireItems(
    items: CreationScenarioCaseEntity.Type['input']['items']
  ): NonNullable<CreationScenarioCaseEntity.Type['input']['items']> {
    if (items === undefined) {
      throw new WorkerPoolError({
        'code': 'workerPool.invalidScenario',
        'message': 'scenario input.items is required'
      });
    }
    return items;
  }

  static requireExpectedString(value: string | undefined): string {
    if (value === undefined) {
      throw new WorkerPoolError({
        'code': 'workerPool.invalidScenario',
        'message': 'scenario expected field is required'
      });
    }
    return value;
  }
}

class CreationRunners {
  static 'caller-supplied-signal'(
    scenarioCase: ScenarioCaseOfType<CreationScenarioCaseEntity.Type, 'caller-supplied-signal'>
  ): Promise<void> {
    class TrackingSignal extends Signal {
      calls = 0;

      public constructor() {
        super();
      }

      protected override onCompose(): void {
        this.calls += 1;
      }
    }

    const signal = new TrackingSignal();
    const pool = WorkerPool.create<
      NonNullable<CreationScenarioCaseEntity.Type['input']['items']>[number],
      string
    >({
      ...CreationSupport.resolvePoolConfig(scenarioCase.input.workerPool),
      'signal': signal
    });

    const result = (async (): Promise<void> => {
      const results = await pool.run(CreationSupport.requireItems(scenarioCase.input.items));
      assert.deepStrictEqual(results, scenarioCase.expected.results);
      assert.equal(signal.calls, scenarioCase.expected.composeCalls);
    })();
    return result;
  }

  static 'default-concurrency'(
    scenarioCase: ScenarioCaseOfType<CreationScenarioCaseEntity.Type, 'default-concurrency'>
  ): Promise<void> {
    const pool = WorkerPool.create<
      NonNullable<CreationScenarioCaseEntity.Type['input']['items']>[number],
      string
    >(CreationSupport.resolvePoolConfig(scenarioCase.input.workerPool));
    const result = (async (): Promise<void> => {
      const results = await pool.run(CreationSupport.requireItems(scenarioCase.input.items));
      assert.deepStrictEqual(results, scenarioCase.expected.results);
    })();
    return result;
  }

  static 'explicit-bounded-concurrency'(
    scenarioCase: ScenarioCaseOfType<
      CreationScenarioCaseEntity.Type,
      'explicit-bounded-concurrency'
    >
  ): Promise<void> {
    const pool = WorkerPool.create<
      NonNullable<CreationScenarioCaseEntity.Type['input']['items']>[number],
      string
    >(CreationSupport.resolvePoolConfig(scenarioCase.input.workerPool));

    const result = (async (): Promise<void> => {
      const results = await pool.run(CreationSupport.requireItems(scenarioCase.input.items));
      assert.deepStrictEqual(results, scenarioCase.expected.results);
    })();
    return result;
  }

  static 'foreign-construction'(
    scenarioCase: ScenarioCaseOfType<CreationScenarioCaseEntity.Type, 'foreign-construction'>
  ): void {
    class ForeignWorkerPool extends WorkerPool<
      NonNullable<CreationScenarioCaseEntity.Type['input']['items']>[number],
      string
    > {
      constructor() {
        const parsedConfig = WorkerPoolConfigEntity.intake(
          CreationSupport.resolveRequiredPoolConfig(scenarioCase.input.workerPool)
        );
        if (parsedConfig.batchConcurrency === undefined || parsedConfig.concurrency === undefined) {
          throw new WorkerPoolError({
            'code': 'workerPool.invalidForeignConstructionScenario',
            'message':
              'foreign-construction scenario input.workerPool requires batch.concurrency and concurrency'
          });
        }
        super({
          'abortSignal': undefined,
          'batchConcurrency': parsedConfig.batchConcurrency,
          'concurrency': parsedConfig.concurrency,
          'signal': Signal.create(),
          ...(parsedConfig.startupTimeoutMs === undefined
            ? {}
            : { 'startupTimeoutMs': parsedConfig.startupTimeoutMs }),
          ...(parsedConfig.timeoutMs === undefined ? {} : { 'timeoutMs': parsedConfig.timeoutMs }),
          'workerPath': parsedConfig.workerPath
        });
      }
    }

    const ForeignWorkerPoolConstructor = new Proxy(ForeignWorkerPool, {
      'construct': function (): object {
        return {};
      }
    });

    assert.throws(
      () => {
        const result = ForeignWorkerPoolConstructor.create<
          NonNullable<CreationScenarioCaseEntity.Type['input']['items']>[number],
          string,
          ForeignWorkerPool
        >(CreationSupport.resolvePoolConfig(scenarioCase.input.workerPool));
        return result;
      },
      (error): boolean => {
        assert.ok(error instanceof WorkerPoolError);
        assert.ok(
          error instanceof Error && error.message.includes('must construct a WorkerPool instance')
        );
        return true;
      }
    );
  }

  static 'missing-worker-path'(
    scenarioCase: ScenarioCaseOfType<CreationScenarioCaseEntity.Type, 'missing-worker-path'>
  ): void {
    assert.throws(
      () => {
        const result = WorkerPool.create(
          CreationSupport.resolvePoolConfig(scenarioCase.input.workerPool)
        );
        return result;
      },
      (error: Error): boolean => {
        assert.ok(error instanceof WorkerPoolError);
        assert.ok(
          error.message.includes(
            CreationSupport.requireExpectedString(scenarioCase.expected.errorMessageIncludes)
          )
        );
        return true;
      }
    );
  }

  static declaresExtraTests(): void {
    void it('rejects invalid runtime concurrency before dispatch', () => {
      assert.throws(
        () => {
          const result = WorkerPool.create<
            NonNullable<CreationScenarioCaseEntity.Type['input']['items']>[number],
            string
          >({
            'concurrency': 0,
            'workerPath': CreationSupport.resolveWorkerPath('../fixtures/echoWorker.ts')
          });
          return result;
        },
        (error: Error): boolean => {
          const result = error.message.includes('WorkerPool configuration is invalid');
          return result;
        }
      );
    });

    void it('WorkerPoolError forwards the shared error arguments while remaining non-retryable', () => {
      const error = new WorkerPoolError({
        'code': 'workerPool.context',
        'correlationId': 'worker-correlation',
        'instance': 'urn:worker-pool:context',
        'message': 'worker context',
        'metadata': { 'workerId': 1 },
        'status': 503
      });

      assert.equal(error.correlationId, 'worker-correlation');
      assert.equal(error.instance, 'urn:worker-pool:context');
      assert.deepEqual(error.metadata, { 'workerId': 1 });
      assert.equal(error.retryable, false);
      assert.equal(error.status, 503);
    });
  }
}

ScenarioSuite.register({
  'entity': CreationScenarioCaseEntity,
  'extraTests': CreationRunners.declaresExtraTests,
  'file': scenarioGroups,
  'name': 'WorkerPool.create',
  'runners': CreationRunners
});
