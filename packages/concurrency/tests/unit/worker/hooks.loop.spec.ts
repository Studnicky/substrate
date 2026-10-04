import { RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import type { WorkerErrorEnvelopeEntity } from '../../../src/worker/entities/WorkerErrorEnvelopeEntity.js';
import type { WorkerLogEnvelopeEntity } from '../../../src/worker/entities/WorkerLogEnvelopeEntity.js';
import type { WorkerProgressEnvelopeEntity } from '../../../src/worker/entities/WorkerProgressEnvelopeEntity.js';
import type { WorkerPoolConfigInterface } from '../../../src/worker/interfaces/WorkerPoolConfigInterface.js';
import type { WorkerResultEnvelopeInterface } from '../../../src/worker/interfaces/WorkerResultEnvelopeInterface.js';

import { ScenarioSuite } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { WorkerPool } from '../../../src/worker/WorkerPool.js';
import { WorkerFixturePath } from '../../helpers/worker/WorkerFixturePath.js';
import { HooksScenarioCaseEntity } from './entities/HooksScenarioCaseEntity.js';
import scenarioGroups from './hooks.scenarios.json' with { 'type': 'json' };

class HooksSupport {
  static resolveWorkerPath(relativePath: string): string {
    const absolutePath = WorkerFixturePath.resolveFromModule(relativePath, import.meta.url);
    return absolutePath;
  }

  static resolvePoolConfig(
    config: HooksScenarioCaseEntity.Type['input']['workerPool']
  ): WorkerPoolConfigInterface {
    const resolved: WorkerPoolConfigInterface = {
      'workerPath': HooksSupport.resolveWorkerPath(config.workerPath)
    };
    if (config.concurrency !== undefined) {
      resolved.concurrency = config.concurrency;
    }
    return resolved;
  }

  static requireItems(
    items: HooksScenarioCaseEntity.Type['input']['items']
  ): NonNullable<HooksScenarioCaseEntity.Type['input']['items']> {
    if (items === undefined) {
      throw RuntimeError.create('scenario input.items is required');
    }
    return items;
  }

  static requireHookErrorMessages(
    hookErrorMessages: HooksScenarioCaseEntity.Type['expected']['hookErrorMessages']
  ): string[] {
    if (hookErrorMessages === undefined) {
      throw RuntimeError.create('scenario expected.hookErrorMessages is required');
    }
    return hookErrorMessages;
  }

  static requireExpectedString(value: string | undefined, field: string): string {
    if (value === undefined) {
      throw RuntimeError.create(`scenario expected.${field} is required`);
    }
    return value;
  }

  static requireFirstItems(
    items: HooksScenarioCaseEntity.Type['input']['firstItems']
  ): NonNullable<HooksScenarioCaseEntity.Type['input']['firstItems']> {
    if (items === undefined) {
      throw RuntimeError.create('scenario input.firstItems is required');
    }
    return items;
  }

  static requireSecondItems(
    items: HooksScenarioCaseEntity.Type['input']['secondItems']
  ): NonNullable<HooksScenarioCaseEntity.Type['input']['secondItems']> {
    if (items === undefined) {
      throw RuntimeError.create('scenario input.secondItems is required');
    }
    return items;
  }

  static async captureUnhandledRejections(action: () => Promise<void>): Promise<unknown[]> {
    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (reason: Error): void => {
      rejectionEvents.push(reason);
    };

    process.on('unhandledRejection', onUnhandledRejection);
    try {
      await action();
      await new Promise((resolve): void => {
        setImmediate(resolve);
      });
      await new Promise((resolve): void => {
        setImmediate(resolve);
      });
      return rejectionEvents;
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  }

  static hookErrors(
    pool: WorkerPool<NonNullable<HooksScenarioCaseEntity.Type['input']['items']>[number], string>
  ): { 'causeMessage': string; 'hookName': string }[] {
    const result = pool.getHookErrors().map(({ cause, hookName }) => {
      return {
        'causeMessage': cause instanceof Error ? cause.message : String(cause),
        'hookName': hookName
      };
    });
    return result;
  }

  static expectedHookErrors(
    messages: string[],
    hookName: string
  ): { 'causeMessage': string; 'hookName': string }[] {
    const result = messages.map((causeMessage) => {
      return { 'causeMessage': causeMessage, 'hookName': hookName };
    });
    return result;
  }

  static assertInstanceHookErrors(
    errors: readonly { readonly 'cause'?: unknown; readonly 'hookName': string }[],
    expectedHookErrorName: string,
    expectedHookErrorMessage: string
  ): void {
    assert.equal(errors[0]?.hookName, expectedHookErrorName);
    for (let errorIndex = 0; errorIndex < errors.length; errorIndex += 1) {
      const error = errors[errorIndex];
      assert.equal(error?.hookName, expectedHookErrorName);
      assert.equal(error?.cause instanceof Error && error.cause.message, expectedHookErrorMessage);
    }
  }
}

class HooksRunners {
  static 'async-rejecting-on-message'(
    scenarioCase: ScenarioCaseOfType<HooksScenarioCaseEntity.Type, 'async-rejecting-on-message'>
  ): Promise<void> {
    class AsyncRejectingMessagePool extends WorkerPool<
      NonNullable<HooksScenarioCaseEntity.Type['input']['items']>[number],
      string
    > {
      protected override async onMessage(): Promise<void> {
        await Promise.resolve();
        throw RuntimeError.create('async onMessage boom');
      }
    }

    const pool = AsyncRejectingMessagePool.create<
      NonNullable<HooksScenarioCaseEntity.Type['input']['items']>[number],
      string,
      AsyncRejectingMessagePool
    >(HooksSupport.resolvePoolConfig(scenarioCase.input.workerPool));
    const result = (async (): Promise<void> => {
      const rejectionEvents = await HooksSupport.captureUnhandledRejections(async () => {
        const results = await pool.run(HooksSupport.requireItems(scenarioCase.input.items));
        assert.deepStrictEqual(results, scenarioCase.expected.results);
        assert.deepStrictEqual(
          HooksSupport.hookErrors(pool),
          HooksSupport.expectedHookErrors(
            HooksSupport.requireHookErrorMessages(scenarioCase.expected.hookErrorMessages),
            'onMessage'
          )
        );
      });

      assert.deepStrictEqual(rejectionEvents, scenarioCase.expected.rejectionEvents);
    })();
    return result;
  }

  static 'error-envelope-and-hook'(
    scenarioCase: ScenarioCaseOfType<HooksScenarioCaseEntity.Type, 'error-envelope-and-hook'>
  ): Promise<void> {
    const seenTypes: string[] = [];
    const seenErrors: string[] = [];

    class ObservingPool extends WorkerPool<
      NonNullable<HooksScenarioCaseEntity.Type['input']['items']>[number],
      string
    > {
      protected override onMessage(
        envelope:
          | WorkerErrorEnvelopeEntity.Type
          | WorkerLogEnvelopeEntity.Type
          | WorkerProgressEnvelopeEntity.Type
          | WorkerResultEnvelopeInterface<string>
      ): void {
        seenTypes.push(envelope.type);
      }

      protected override onWorkerError(error: Error): void {
        seenErrors.push(error.message);
      }
    }

    const pool = ObservingPool.create<
      NonNullable<HooksScenarioCaseEntity.Type['input']['items']>[number],
      string,
      ObservingPool
    >(HooksSupport.resolvePoolConfig(scenarioCase.input.workerPool));
    const result = (async (): Promise<void> => {
      await assert.rejects(
        pool.run(HooksSupport.requireItems(scenarioCase.input.items)),
        (error: Error): boolean => {
          assert.ok(error.message.includes('kaboom'));
          return true;
        }
      );
      assert.deepStrictEqual(seenTypes, scenarioCase.expected.seenTypes);
      assert.deepStrictEqual(seenErrors, scenarioCase.expected.seenErrors);
    })();
    return result;
  }

  static 'hook-errors-instance-local'(
    scenarioCase: ScenarioCaseOfType<HooksScenarioCaseEntity.Type, 'hook-errors-instance-local'>
  ): Promise<void> {
    class FirstThrowingPool extends WorkerPool<
      NonNullable<HooksScenarioCaseEntity.Type['input']['items']>[number],
      string
    > {
      static readonly hookCause = RuntimeError.create('first pool hook failed');

      protected override onWorkerCreated(): void {
        throw FirstThrowingPool.hookCause;
      }
    }

    class SecondThrowingPool extends WorkerPool<
      NonNullable<HooksScenarioCaseEntity.Type['input']['items']>[number],
      string
    > {
      static readonly hookCause = RuntimeError.create('second pool hook failed');

      protected override onWorkerCreated(): void {
        throw SecondThrowingPool.hookCause;
      }
    }

    const first = FirstThrowingPool.create<
      NonNullable<HooksScenarioCaseEntity.Type['input']['items']>[number],
      string,
      FirstThrowingPool
    >(HooksSupport.resolvePoolConfig(scenarioCase.input.workerPool));
    const second = SecondThrowingPool.create<
      NonNullable<HooksScenarioCaseEntity.Type['input']['items']>[number],
      string,
      SecondThrowingPool
    >(HooksSupport.resolvePoolConfig(scenarioCase.input.workerPool));

    const result = (async (): Promise<void> => {
      const [firstResults, secondResults] = await Promise.all([
        first.run(HooksSupport.requireFirstItems(scenarioCase.input.firstItems)),
        second.run(HooksSupport.requireSecondItems(scenarioCase.input.secondItems))
      ]);

      const firstErrors = first.getHookErrors();
      const secondErrors = second.getHookErrors();
      assert.deepStrictEqual(firstResults, scenarioCase.expected.firstResults);
      assert.deepStrictEqual(secondResults, scenarioCase.expected.secondResults);
      HooksSupport.assertInstanceHookErrors(
        firstErrors,
        HooksSupport.requireExpectedString(
          scenarioCase.expected.firstHookErrorName,
          'firstHookErrorName'
        ),
        HooksSupport.requireExpectedString(
          scenarioCase.expected.firstHookErrorMessage,
          'firstHookErrorMessage'
        )
      );
      HooksSupport.assertInstanceHookErrors(
        secondErrors,
        HooksSupport.requireExpectedString(
          scenarioCase.expected.secondHookErrorName,
          'secondHookErrorName'
        ),
        HooksSupport.requireExpectedString(
          scenarioCase.expected.secondHookErrorMessage,
          'secondHookErrorMessage'
        )
      );
      assert.notStrictEqual(firstErrors[0]?.cause, FirstThrowingPool.hookCause);
      assert.notStrictEqual(secondErrors[0]?.cause, SecondThrowingPool.hookCause);
      assert.notStrictEqual(firstErrors[0], first.getHookErrors()[0]);
      assert.notStrictEqual(secondErrors[0], second.getHookErrors()[0]);
    })();
    return result;
  }

  static 'on-message-envelopes'(
    scenarioCase: ScenarioCaseOfType<HooksScenarioCaseEntity.Type, 'on-message-envelopes'>
  ): Promise<void> {
    const seenTypes: string[] = [];

    class ObservingPool extends WorkerPool<
      NonNullable<HooksScenarioCaseEntity.Type['input']['items']>[number],
      string
    > {
      protected override onMessage(
        envelope:
          | WorkerErrorEnvelopeEntity.Type
          | WorkerLogEnvelopeEntity.Type
          | WorkerProgressEnvelopeEntity.Type
          | WorkerResultEnvelopeInterface<string>
      ): void {
        seenTypes.push(envelope.type);
      }
    }

    const pool = ObservingPool.create<
      NonNullable<HooksScenarioCaseEntity.Type['input']['items']>[number],
      string,
      ObservingPool
    >(HooksSupport.resolvePoolConfig(scenarioCase.input.workerPool));
    const result = (async (): Promise<void> => {
      await pool.run(HooksSupport.requireItems(scenarioCase.input.items));
      assert.deepStrictEqual(seenTypes, scenarioCase.expected.seenTypes);
    })();
    return result;
  }

  static 'throwing-on-message'(
    scenarioCase: ScenarioCaseOfType<HooksScenarioCaseEntity.Type, 'throwing-on-message'>
  ): Promise<void> {
    class ThrowingMessagePool extends WorkerPool<
      NonNullable<HooksScenarioCaseEntity.Type['input']['items']>[number],
      string
    > {
      protected override onMessage(): void {
        throw RuntimeError.create('hook boom');
      }
    }

    const pool = ThrowingMessagePool.create<
      NonNullable<HooksScenarioCaseEntity.Type['input']['items']>[number],
      string,
      ThrowingMessagePool
    >(HooksSupport.resolvePoolConfig(scenarioCase.input.workerPool));
    const result = (async (): Promise<void> => {
      const results = await pool.run(HooksSupport.requireItems(scenarioCase.input.items));
      assert.deepStrictEqual(results, scenarioCase.expected.results);
      assert.deepStrictEqual(
        HooksSupport.hookErrors(pool),
        HooksSupport.expectedHookErrors(
          HooksSupport.requireHookErrorMessages(scenarioCase.expected.hookErrorMessages),
          'onMessage'
        )
      );
    })();
    return result;
  }
}

ScenarioSuite.register({
  'entity': HooksScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'WorkerPool hooks',
  'runners': HooksRunners
});
