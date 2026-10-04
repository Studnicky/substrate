import type { ComposedSignalInterface } from '@studnicky/signal/interfaces';

import { RuntimeError } from '@studnicky/errors/node';
import { Signal } from '@studnicky/signal/node';
import { CallerFault } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import type { WorkerPoolConfigInterface } from '../../../src/worker/interfaces/WorkerPoolConfigInterface.js';

import { ScenarioSuite } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { WorkerPool } from '../../../src/worker/WorkerPool.js';
import { TimeoutScenarioCaseEntity } from './entities/TimeoutScenarioCaseEntity.js';
import scenarioGroups from './timeout.scenarios.json' with { 'type': 'json' };

class TimeoutSupport {
  static requireItems(
    items: TimeoutScenarioCaseEntity.Type['input']['items']
  ): NonNullable<TimeoutScenarioCaseEntity.Type['input']['items']> {
    if (items === undefined) {
      throw RuntimeError.create('scenario input.items is required');
    }
    return items;
  }

  static requireString(value: string | undefined): string {
    if (value === undefined) {
      throw RuntimeError.create('scenario expected field is required');
    }
    return value;
  }

  static resolveWorkerPath(relativePath: string): string {
    try {
      const workerUrl = new URL(relativePath, import.meta.url);
      const result = fileURLToPath(workerUrl);
      return result;
    } catch (cause) {
      throw RuntimeError.create('worker path cannot be resolved', { 'cause': cause });
    }
  }

  static resolvePoolConfig(
    config: TimeoutScenarioCaseEntity.Type['input']['workerPool']
  ): WorkerPoolConfigInterface {
    const resolved: WorkerPoolConfigInterface = {
      'workerPath': TimeoutSupport.resolveWorkerPath(config.workerPath)
    };
    if (config.batch?.concurrency !== undefined) {
      resolved.batchConcurrency = config.batch.concurrency;
    }
    if (config.concurrency !== undefined) {
      resolved.concurrency = config.concurrency;
    }
    if (config.startupTimeoutMs !== undefined) {
      resolved.startupTimeoutMs = config.startupTimeoutMs;
    }
    if (config.timeoutMs !== undefined) {
      resolved.timeoutMs = config.timeoutMs;
    }
    return resolved;
  }
}

class TimeoutRunners {
  static 'awaits-signal-composition'(
    scenarioCase: ScenarioCaseOfType<TimeoutScenarioCaseEntity.Type, 'awaits-signal-composition'>
  ): Promise<void> {
    class DeferredSignal extends Signal {
      readonly entered = Promise.withResolvers<void>();
      readonly release = Promise.withResolvers<void>();

      public constructor() {
        super();
      }

      protected override async onCompose(): Promise<void> {
        this.entered.resolve();
        await this.release.promise;
      }
    }

    class MessageObservingPool extends WorkerPool<{ 'value': string }, string> {
      messages = 0;

      protected override onMessage(): void {
        this.messages += 1;
      }
    }

    const signal = new DeferredSignal();
    const pool = MessageObservingPool.create<{ 'value': string }, string, MessageObservingPool>({
      ...TimeoutSupport.resolvePoolConfig(scenarioCase.input.workerPool),
      'signal': signal
    });
    const running = pool.run(TimeoutSupport.requireItems(scenarioCase.input.items));

    const result = (async (): Promise<void> => {
      await signal.entered.promise;
      assert.equal(pool.messages, scenarioCase.expected.messagesAfterCompose);
      signal.release.resolve();
      const completedResults = await running;
      assert.deepStrictEqual(completedResults, scenarioCase.expected.results);
      assert.equal(pool.messages, scenarioCase.expected.messagesAfterRun);
    })();
    return result;
  }

  static 'compose-after-exit'(
    scenarioCase: ScenarioCaseOfType<TimeoutScenarioCaseEntity.Type, 'compose-after-exit'>
  ): Promise<void> {
    class DeferredSignal extends Signal {
      #composeCount = 0;
      readonly entered = Promise.withResolvers<void>();
      readonly release = Promise.withResolvers<void>();

      public constructor() {
        super();
      }

      protected override async onCompose(): Promise<void> {
        this.#composeCount += 1;
        if (this.#composeCount !== 1) {
          return;
        }
        this.entered.resolve();
        await this.release.promise;
      }
    }

    const signal = new DeferredSignal();
    const pool = WorkerPool.create<{ 'value': string }, string>({
      ...TimeoutSupport.resolvePoolConfig(scenarioCase.input.workerPool),
      'signal': signal
    });
    const running = pool.run(TimeoutSupport.requireItems(scenarioCase.input.items));

    const result = (async (): Promise<void> => {
      await signal.entered.promise;
      signal.release.resolve();
      await assert.rejects(running, (error: Error): boolean => {
        assert.ok(error instanceof Error);
        assert.ok(
          error.message.includes(
            TimeoutSupport.requireString(scenarioCase.expected.errorMessageIncludes)
          )
        );
        return true;
      });
    })();
    return result;
  }

  static 'compose-after-exit-queued'(
    scenarioCase: ScenarioCaseOfType<TimeoutScenarioCaseEntity.Type, 'compose-after-exit-queued'>
  ): Promise<void> {
    const gateBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT);
    const gate = new Int32Array(gateBuffer);
    gate[0] = 0;

    class DeferredSignal extends Signal {
      readonly #gate = Promise.withResolvers<void>();
      #composeCount = 0;
      readonly entered = Promise.withResolvers<void>();

      public constructor() {
        super();
      }

      protected override async onCompose(): Promise<void> {
        this.#composeCount += 1;
        if (this.#composeCount === 1) {
          return;
        }
        this.entered.resolve();
        await this.#gate.promise;
      }

      release(): void {
        this.#gate.resolve();
      }
    }

    class GatedExitPool extends WorkerPool<
      { 'exitAfterResult'?: boolean; 'gate': SharedArrayBuffer; 'value': string },
      string
    > {
      protected override onMessage(envelope: { 'type': string; 'value'?: string }): void {
        if (envelope.type === 'result' && Atomics.compareExchange(gate, 0, 0, 1) === 0) {
          Atomics.notify(gate, 0, 1);
        }
      }
    }

    const signal = new DeferredSignal();
    const pool = GatedExitPool.create<
      { 'exitAfterResult'?: boolean; 'gate': SharedArrayBuffer; 'value': string },
      string,
      GatedExitPool
    >({
      ...TimeoutSupport.resolvePoolConfig(scenarioCase.input.workerPool),
      'signal': signal
    });
    const running = pool.run(
      TimeoutSupport.requireItems(scenarioCase.input.items).map((item) => {
        return { ...item, 'gate': gateBuffer };
      })
    );

    const result = (async (): Promise<void> => {
      await signal.entered.promise;
      signal.release();
      const completedResults = await running;
      assert.deepStrictEqual(completedResults, scenarioCase.expected.results);
    })();
    return result;
  }

  static 'signal-already-aborted'(
    scenarioCase: ScenarioCaseOfType<TimeoutScenarioCaseEntity.Type, 'signal-already-aborted'>
  ): Promise<void> {
    const abortReason = RuntimeError.create('signal-already-aborted: composed signal reason');

    class AbortedComposedSignal implements ComposedSignalInterface {
      public readonly signal: AbortSignal;

      public constructor(signal: AbortSignal) {
        this.signal = signal;
      }

      public dispose(): void {}

      public [Symbol.dispose](): void {}
    }

    class AbortedSignal extends Signal {
      public constructor() {
        super();
      }

      override async compose(): Promise<ComposedSignalInterface> {
        await Promise.resolve();
        const controller = new AbortController();
        controller.abort(abortReason);
        const composedSignal = new AbortedComposedSignal(controller.signal);
        const result = Promise.resolve(composedSignal);
        return await result;
      }
    }

    const timedOutIndexes: number[] = [];
    const workerErrors: { 'error': Error; 'index': number }[] = [];

    class ObservingPool extends WorkerPool<{ 'value': string }, string> {
      protected override onWorkerTimeout(index: number): void {
        timedOutIndexes.push(index);
      }

      protected override onWorkerError(error: Error, index: number): void {
        workerErrors.push({ 'error': error, 'index': index });
      }
    }

    const pool = ObservingPool.create<{ 'value': string }, string, ObservingPool>({
      ...TimeoutSupport.resolvePoolConfig(scenarioCase.input.workerPool),
      'signal': new AbortedSignal()
    });

    const result = (async (): Promise<void> => {
      await assert.rejects(
        pool.run(TimeoutSupport.requireItems(scenarioCase.input.items)),
        (error: Error): boolean => {
          assert.ok(error instanceof Error);
          assert.ok(
            error.message.includes(
              TimeoutSupport.requireString(scenarioCase.expected.errorMessageIncludes)
            )
          );
          assert.equal(error.cause, abortReason);
          return true;
        }
      );

      // The task never ran, so this is not a timeout: onWorkerTimeout must not fire, and
      // onWorkerError must fire with the abort reason reachable as the error's cause.
      assert.deepStrictEqual(timedOutIndexes, []);
      assert.equal(workerErrors.length, 1);
      assert.equal(workerErrors[0]?.index, 0);
      assert.equal(workerErrors[0]?.error.cause, abortReason);
    })();
    return result;
  }

  static 'signal-compose-rejects'(
    scenarioCase: ScenarioCaseOfType<TimeoutScenarioCaseEntity.Type, 'signal-compose-rejects'>
  ): Promise<void> {
    class RejectingSignal extends Signal {
      public constructor() {
        super();
      }

      protected override async onCompose(): Promise<void> {
        await Promise.resolve();
        throw RuntimeError.create('signal compose failed');
      }
    }

    class MessageObservingPool extends WorkerPool<{ 'value': string }, string> {
      messages = 0;

      protected override onMessage(): void {
        this.messages += 1;
      }
    }

    const signal = new RejectingSignal();
    const pool = MessageObservingPool.create<{ 'value': string }, string, MessageObservingPool>({
      ...TimeoutSupport.resolvePoolConfig(scenarioCase.input.workerPool),
      'signal': signal
    });

    const result = (async (): Promise<void> => {
      await assert.rejects(
        pool.run(TimeoutSupport.requireItems(scenarioCase.input.items)),
        (error: Error): boolean => {
          assert.ok(error instanceof Error);
          return true;
        }
      );
    })();
    return result;
  }

  static 'signal-compose-rejects-string'(
    scenarioCase: ScenarioCaseOfType<
      TimeoutScenarioCaseEntity.Type,
      'signal-compose-rejects-string'
    >
  ): Promise<void> {
    class RejectingSignal extends Signal {
      public constructor() {
        super();
      }

      protected override async onCompose(): Promise<void> {
        const result = CallerFault.rejection('signal compose failed as string');
        return await result;
      }
    }

    const pool = WorkerPool.create<{ 'value': string }, string>({
      ...TimeoutSupport.resolvePoolConfig(scenarioCase.input.workerPool),
      'signal': new RejectingSignal()
    });

    const result = (async (): Promise<void> => {
      await assert.rejects(
        pool.run(TimeoutSupport.requireItems(scenarioCase.input.items)),
        (error: Error): boolean => {
          assert.ok(error instanceof Error);
          return true;
        }
      );
    })();
    return result;
  }

  static 'startup-timeout'(
    scenarioCase: ScenarioCaseOfType<TimeoutScenarioCaseEntity.Type, 'startup-timeout'>
  ): Promise<void> {
    const timedOutIndexes: number[] = [];
    const workerErrors: { 'error': Error; 'index': number }[] = [];

    class ObservingPool extends WorkerPool<{ 'value': string }, string> {
      protected override onWorkerTimeout(index: number): void {
        timedOutIndexes.push(index);
      }

      protected override onWorkerError(error: Error, index: number): void {
        workerErrors.push({ 'error': error, 'index': index });
      }
    }

    const pool = ObservingPool.create<{ 'value': string }, string, ObservingPool>(
      TimeoutSupport.resolvePoolConfig(scenarioCase.input.workerPool)
    );

    const result = (async (): Promise<void> => {
      await assert.rejects(
        pool.run(TimeoutSupport.requireItems(scenarioCase.input.items)),
        (error: Error): boolean => {
          assert.ok(error instanceof Error);
          assert.ok(
            error.message.includes(
              TimeoutSupport.requireString(scenarioCase.expected.errorMessageIncludes)
            )
          );
          assert.ok(
            !error.message.includes(
              TimeoutSupport.requireString(scenarioCase.expected.excludesMessage)
            )
          );
          return true;
        }
      );

      // A worker that never finishes starting never runs the task, so this is not a task
      // timeout: onWorkerTimeout must not fire, only onWorkerError.
      assert.deepStrictEqual(timedOutIndexes, []);
      assert.equal(workerErrors.length, 1);
      assert.equal(workerErrors[0]?.index, 0);
    })();
    return result;
  }

  static 'within-timeout'(
    scenarioCase: ScenarioCaseOfType<TimeoutScenarioCaseEntity.Type, 'within-timeout'>
  ): Promise<void> {
    const pool = WorkerPool.create<
      NonNullable<TimeoutScenarioCaseEntity.Type['input']['items']>[number],
      string
    >(TimeoutSupport.resolvePoolConfig(scenarioCase.input.workerPool));

    const result = (async (): Promise<void> => {
      const results = await pool.run(TimeoutSupport.requireItems(scenarioCase.input.items));
      assert.deepStrictEqual(results, scenarioCase.expected.results);
    })();
    return result;
  }

  static 'worker-timeout'(
    scenarioCase: ScenarioCaseOfType<TimeoutScenarioCaseEntity.Type, 'worker-timeout'>
  ): Promise<void> {
    const timedOutIndexes: number[] = [];

    class TimeoutObservingPool extends WorkerPool<
      NonNullable<TimeoutScenarioCaseEntity.Type['input']['items']>[number],
      string
    > {
      protected override onWorkerTimeout(index: number): void {
        timedOutIndexes.push(index);
      }
    }

    const pool = TimeoutObservingPool.create<
      NonNullable<TimeoutScenarioCaseEntity.Type['input']['items']>[number],
      string,
      TimeoutObservingPool
    >(TimeoutSupport.resolvePoolConfig(scenarioCase.input.workerPool));

    const result = (async (): Promise<void> => {
      await assert.rejects(
        pool.run(TimeoutSupport.requireItems(scenarioCase.input.items)),
        (error: Error): boolean => {
          const timeoutExceeded = error.message.includes('exceeded its timeout');
          return timeoutExceeded;
        }
      );
      assert.deepStrictEqual(timedOutIndexes, scenarioCase.expected.timedOutIndexes);
    })();
    return result;
  }
}

ScenarioSuite.register({
  'entity': TimeoutScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'WorkerPool timeout',
  'runners': TimeoutRunners
});
