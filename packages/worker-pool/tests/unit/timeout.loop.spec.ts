import { RuntimeError } from '@studnicky/errors/node';
import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ComposedSignalInterface } from '@studnicky/signal/interfaces';
import { Signal } from '@studnicky/signal/node';

import { WorkerPool } from '../../src/WorkerPool.js';
import type { WorkerPoolConfigInterface } from '../../src/interfaces/WorkerPoolConfigInterface.js';
import { TimeoutScenarioCaseEntity } from './entities/TimeoutScenarioCaseEntity.js';
import scenarioGroups from './timeout.scenarios.json' with { type: 'json' };

type ScenarioCase = TimeoutScenarioCaseEntity.Type;
type WorkerPoolInputInterface = ScenarioCase['input']['workerPool'];
type ScenarioItems = NonNullable<ScenarioCase['input']['items']>;
type ItemInterface = ScenarioItems[number];

const fileIntake = ScenarioFileCompiler.compileIntake(TimeoutScenarioCaseEntity.Schema, TimeoutScenarioCaseEntity.Node);

function requireItems(items: ScenarioCase['input']['items']): ScenarioItems {
  if (items === undefined) {
    throw RuntimeError.create('scenario input.items is required');
  }
  return items;
}

function requireString(value: string | undefined): string {
  if (value === undefined) {
    throw RuntimeError.create('scenario expected field is required');
  }
  return value;
}

function resolveWorkerPath(relativePath: string): string {
  return fileURLToPath(new URL(relativePath, import.meta.url));
}

function resolvePoolConfig(config: WorkerPoolInputInterface): WorkerPoolConfigInterface {
  const resolved: WorkerPoolConfigInterface = {
    workerPath: resolveWorkerPath(config.workerPath)
  };
  if (config.batch?.concurrency !== undefined) { resolved.batchConcurrency = config.batch.concurrency; }
  if (config.concurrency !== undefined) { resolved.concurrency = config.concurrency; }
  if (config.startupTimeoutMs !== undefined) { resolved.startupTimeoutMs = config.startupTimeoutMs; }
  if (config.timeoutMs !== undefined) { resolved.timeoutMs = config.timeoutMs; }
  return resolved;
}

const runnerMap: Record<ScenarioCase['shape'], (scenarioCase: ScenarioCase) => Promise<void>> = {
  'worker-timeout': async (scenarioCase) => {
    const timedOutIndexes: number[] = [];

    class TimeoutObservingPool extends WorkerPool<ItemInterface, string> {
      protected override onWorkerTimeout(index: number): void {
        timedOutIndexes.push(index);
      }
    }

    const pool = TimeoutObservingPool.create(resolvePoolConfig(scenarioCase.input.workerPool));

    await assert.rejects(
      pool.run(requireItems(scenarioCase.input.items)),
      /exceeded its timeout/
    );
    assert.deepStrictEqual(timedOutIndexes, scenarioCase.expected.timedOutIndexes);
  },

  'within-timeout': async (scenarioCase) => {
    const pool = WorkerPool.create<ItemInterface, string>(resolvePoolConfig(scenarioCase.input.workerPool));

    const results = await pool.run(requireItems(scenarioCase.input.items));
    assert.deepStrictEqual(results, scenarioCase.expected.results);
  },

  'signal-already-aborted': async (scenarioCase) => {
    const abortReason = RuntimeError.create('signal-already-aborted: composed signal reason');

    class AbortedSignal extends Signal {
      public constructor() {
        super();
      }

      override async compose(): Promise<ComposedSignalInterface> {
        const controller = new AbortController();
        controller.abort(abortReason);
        return {
          'signal': controller.signal,
          'dispose': (): void => {},
          [Symbol.dispose](): void {}
        };
      }
    }

    const timedOutIndexes: number[] = [];
    const workerErrors: Array<{ error: Error; index: number }> = [];

    class ObservingPool extends WorkerPool<{ value: string }, string> {
      protected override onWorkerTimeout(index: number): void {
        timedOutIndexes.push(index);
      }

      protected override onWorkerError(error: Error, index: number): void {
        workerErrors.push({ error, index });
      }
    }

    const pool = ObservingPool.create({
      ...resolvePoolConfig(scenarioCase.input.workerPool),
      signal: new AbortedSignal(),
    });

    await assert.rejects(
      pool.run(requireItems(scenarioCase.input.items)),
      (error: Error) => {
        assert.ok(error instanceof Error);
        assert.ok(error.message.includes(requireString(scenarioCase.expected.errorMessageIncludes)));
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
  },

  'awaits-signal-composition': async (scenarioCase) => {
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

    class MessageObservingPool extends WorkerPool<{ value: string }, string> {
      messages = 0;

      protected override onMessage(): void {
        this.messages += 1;
      }
    }

    const signal = new DeferredSignal();
    const pool = MessageObservingPool.create({
      ...resolvePoolConfig(scenarioCase.input.workerPool),
      signal,
    });
    const running = pool.run(requireItems(scenarioCase.input.items));

    await signal.entered.promise;
    assert.equal(pool.messages, scenarioCase.expected.messagesAfterCompose);
    signal.release.resolve();
    assert.deepStrictEqual(await running, scenarioCase.expected.results);
    assert.equal(pool.messages, scenarioCase.expected.messagesAfterRun);
  },

  'signal-compose-rejects': async (scenarioCase) => {
    class RejectingSignal extends Signal {
      public constructor() {
        super();
      }

      protected override async onCompose(): Promise<void> {
        throw RuntimeError.create('signal compose failed');
      }
    }

    class MessageObservingPool extends WorkerPool<{ value: string }, string> {
      messages = 0;

      protected override onMessage(): void {
        this.messages += 1;
      }
    }

    const signal = new RejectingSignal();
    const pool = MessageObservingPool.create({
      ...resolvePoolConfig(scenarioCase.input.workerPool),
      signal,
    });

    await assert.rejects(
      pool.run(requireItems(scenarioCase.input.items)),
      (error: Error) => {
        assert.ok(error instanceof Error);
        return true;
      }
    );
  },
  'signal-compose-rejects-string': async (scenarioCase) => {
    class RejectingSignal extends Signal {
      public constructor() {
        super();
      }

      protected override async onCompose(): Promise<void> {
        throw 'signal compose failed as string';
      }
    }

    const pool = WorkerPool.create<{ value: string }, string>({
      ...resolvePoolConfig(scenarioCase.input.workerPool),
      signal: new RejectingSignal(),
    });

    await assert.rejects(
      pool.run(requireItems(scenarioCase.input.items)),
      (error: Error) => {
        assert.ok(error instanceof Error);
        return true;
      }
    );
  },
  'compose-after-exit': async (scenarioCase) => {
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
    const pool = WorkerPool.create<{ value: string }, string>({
      ...resolvePoolConfig(scenarioCase.input.workerPool),
      signal,
    });
    const running = pool.run(requireItems(scenarioCase.input.items));

    await signal.entered.promise;
    signal.release.resolve();
    await assert.rejects(
      running,
      (error: Error) => {
        assert.ok(error instanceof Error);
        assert.ok(error.message.includes(requireString(scenarioCase.expected.errorMessageIncludes)));
        return true;
      }
    );
  },
  'compose-after-exit-queued': async (scenarioCase) => {
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

    class GatedExitPool extends WorkerPool<{ exitAfterResult?: boolean; gate: SharedArrayBuffer; value: string }, string> {
      protected override onMessage(envelope: { type: string; value?: string }): void {
        if (envelope.type === 'result' && Atomics.compareExchange(gate, 0, 0, 1) === 0) {
          Atomics.notify(gate, 0, 1);
        }
      }
    }

    const signal = new DeferredSignal();
    const pool = GatedExitPool.create<{ exitAfterResult?: boolean; gate: SharedArrayBuffer; value: string }, string, GatedExitPool>({
      ...resolvePoolConfig(scenarioCase.input.workerPool),
      signal,
    });
    const running = pool.run(requireItems(scenarioCase.input.items).map((item) => ({ ...item, gate: gateBuffer })));
    await signal.entered.promise;
    signal.release();
    assert.deepStrictEqual(await running, scenarioCase.expected.results);
  },

  'startup-timeout': async (scenarioCase) => {
    const timedOutIndexes: number[] = [];
    const workerErrors: Array<{ error: Error; index: number }> = [];

    class ObservingPool extends WorkerPool<{ value: string }, string> {
      protected override onWorkerTimeout(index: number): void {
        timedOutIndexes.push(index);
      }

      protected override onWorkerError(error: Error, index: number): void {
        workerErrors.push({ error, index });
      }
    }

    const pool = ObservingPool.create(resolvePoolConfig(scenarioCase.input.workerPool));

    await assert.rejects(
      pool.run(requireItems(scenarioCase.input.items)),
      (error: Error) => {
        assert.ok(error instanceof Error);
        assert.ok(error.message.includes(requireString(scenarioCase.expected.errorMessageIncludes)));
        assert.ok(!error.message.includes(requireString(scenarioCase.expected.excludesMessage)));
        return true;
      }
    );

    // A worker that never finishes starting never runs the task, so this is not a task
    // timeout: onWorkerTimeout must not fire, only onWorkerError.
    assert.deepStrictEqual(timedOutIndexes, []);
    assert.equal(workerErrors.length, 1);
    assert.equal(workerErrors[0]?.index, 0);
  }
};

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  await runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('WorkerPool timeout', () => {
  for (const scenario of fileIntake(scenarioGroups).cases) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
