import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Signal } from '@studnicky/signal';

import { WorkerPool } from '../../src/WorkerPool.js';
import type { WorkerPoolConfigInterface } from '../../src/interfaces/WorkerPoolConfigInterface.js';
import scenarioGroups from './timeout.scenarios.json';

interface ItemInterface {
  error?: string;
  ms?: number;
  value: string;
}

interface DeferredSignalInputInterface {
  kind: 'deferred-compose';
}

interface BatchConfigInputInterface {
  concurrency?: WorkerPoolConfigInterface['batchConcurrency'];
}

interface WorkerPoolInputInterface {
  batch?: BatchConfigInputInterface;
  concurrency?: WorkerPoolConfigInterface['concurrency'];
  timeoutMs?: WorkerPoolConfigInterface['timeoutMs'];
  workerPath: WorkerPoolConfigInterface['workerPath'];
}

type ScenarioCase =
  | {
      description: string;
      expected: { timedOutIndexes: number[] };
      input: { items: ItemInterface[]; workerPool: WorkerPoolInputInterface };
      kind: 'worker-timeout';
      name: string;
    }
  | {
      description: string;
      expected: { errorMessageIncludes: string };
      input: { items: Array<{ value: string }>; workerPool: WorkerPoolInputInterface };
      kind: 'signal-already-aborted';
      name: string;
    }
  | {
      description: string;
      expected: { results: string[] };
      input: { items: ItemInterface[]; workerPool: WorkerPoolInputInterface };
      kind: 'within-timeout';
      name: string;
    }
  | {
      description: string;
      expected: { messagesAfterCompose: number; messagesAfterRun: number; results: string[] };
      input: { items: Array<{ value: string }>; signal: DeferredSignalInputInterface; workerPool: WorkerPoolInputInterface };
      kind: 'awaits-signal-composition';
      name: string;
    }
  | {
      description: string;
      expected: { errorMessageIncludes: string };
      input: { items: Array<{ value: string }>; signal: { kind: 'rejecting-compose' }; workerPool: WorkerPoolInputInterface };
      kind: 'signal-compose-rejects';
      name: string;
    }
  | {
      description: string;
      expected: { errorMessageIncludes: string };
      input: { items: Array<{ value: string }>; signal: { kind: 'rejecting-compose-string' }; workerPool: WorkerPoolInputInterface };
      kind: 'signal-compose-rejects-string';
      name: string;
    }
  | {
      description: string;
      expected: { errorMessageIncludes: string };
      input: { items: Array<{ value: string }>; signal: { kind: 'deferred-compose' }; workerPool: WorkerPoolInputInterface };
      kind: 'compose-after-exit';
      name: string;
    }
  | {
      description: string;
      expected: { results: string[] };
      input: { items: Array<{ exitAfterResult?: boolean; value: string }>; signal: { kind: 'deferred-compose' }; workerPool: WorkerPoolInputInterface };
      kind: 'compose-after-exit-queued';
      name: string;
    }

function resolveWorkerPath(relativePath: string): string {
  return new URL(relativePath, import.meta.url).pathname;
}

function resolvePoolConfig(config: WorkerPoolInputInterface): WorkerPoolConfigInterface {
  const resolved: WorkerPoolConfigInterface = {
    workerPath: resolveWorkerPath(config.workerPath)
  };
  if (config.batch?.concurrency !== undefined) { resolved.batchConcurrency = config.batch.concurrency; }
  if (config.concurrency !== undefined) { resolved.concurrency = config.concurrency; }
  if (config.timeoutMs !== undefined) { resolved.timeoutMs = config.timeoutMs; }
  return resolved;
}

const runnerMap: Record<ScenarioCase['kind'], (scenarioCase: ScenarioCase) => Promise<void>> = {
  'worker-timeout': async (scenarioCase) => {
    const timedOutIndexes: number[] = [];

    class TimeoutObservingPool extends WorkerPool<ItemInterface, string> {
      protected override onWorkerTimeout(index: number): void {
        timedOutIndexes.push(index);
      }
    }

    const pool = TimeoutObservingPool.create(resolvePoolConfig(scenarioCase.input.workerPool));

    await assert.rejects(
      pool.run(scenarioCase.input.items),
      /exceeded its timeout/
    );
    assert.deepStrictEqual(timedOutIndexes, scenarioCase.expected.timedOutIndexes);
  },

  'within-timeout': async (scenarioCase) => {
    const pool = WorkerPool.create<ItemInterface, string>(resolvePoolConfig(scenarioCase.input.workerPool));

    const results = await pool.run(scenarioCase.input.items);
    assert.deepStrictEqual(results, scenarioCase.expected.results);
  },

  'signal-already-aborted': async (scenarioCase) => {
    class AbortedSignal extends Signal {
      protected override async compose(): Promise<AbortSignal> {
        const controller = new AbortController();
        controller.abort();
        return controller.signal;
      }
    }

    const pool = WorkerPool.create<{ value: string }, string>({
      ...resolvePoolConfig(scenarioCase.input.workerPool),
      signal: new AbortedSignal(),
    });

    await assert.rejects(
      pool.run(scenarioCase.input.items),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.ok(error.message.includes(scenarioCase.expected.errorMessageIncludes));
        return true;
      }
    );
  },

  'awaits-signal-composition': async (scenarioCase) => {
    class DeferredSignal extends Signal {
      readonly entered = Promise.withResolvers<void>();
      readonly release = Promise.withResolvers<void>();

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
    const running = pool.run(scenarioCase.input.items);

    await signal.entered.promise;
    assert.equal(pool.messages, scenarioCase.expected.messagesAfterCompose);
    signal.release.resolve();
    assert.deepStrictEqual(await running, scenarioCase.expected.results);
    assert.equal(pool.messages, scenarioCase.expected.messagesAfterRun);
  },

  'signal-compose-rejects': async (scenarioCase) => {
    class RejectingSignal extends Signal {
      protected override async onCompose(): Promise<void> {
        throw new Error('signal compose failed');
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
      pool.run(scenarioCase.input.items),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        return true;
      }
    );
  },
  'signal-compose-rejects-string': async (scenarioCase) => {
    class RejectingSignal extends Signal {
      protected override async onCompose(): Promise<void> {
        throw 'signal compose failed as string';
      }
    }

    const pool = WorkerPool.create<{ value: string }, string>({
      ...resolvePoolConfig(scenarioCase.input.workerPool),
      signal: new RejectingSignal(),
    });

    await assert.rejects(
      pool.run(scenarioCase.input.items),
      (error: unknown) => {
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
    const running = pool.run(scenarioCase.input.items);

    await signal.entered.promise;
    signal.release.resolve();
    await assert.rejects(
      running,
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.ok(error.message.includes(scenarioCase.expected.errorMessageIncludes));
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
    const pool = GatedExitPool.create({
      ...resolvePoolConfig(scenarioCase.input.workerPool),
      signal,
    });
    const running = pool.run(scenarioCase.input.items.map((item) => ({ ...item, gate: gateBuffer })));
    await signal.entered.promise;
    signal.release();
    assert.deepStrictEqual(await running, scenarioCase.expected.results);
  }
};

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  await runnerMap[scenarioCase.kind](scenarioCase);
}

void describe('WorkerPool timeout', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
