import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { WorkerErrorEnvelopeInterface } from '../../src/interfaces/WorkerErrorEnvelopeInterface.js';
import type { WorkerLogEnvelopeInterface } from '../../src/interfaces/WorkerLogEnvelopeInterface.js';
import type { WorkerPoolConfigInterface } from '../../src/interfaces/WorkerPoolConfigInterface.js';
import type { WorkerProgressEnvelopeInterface } from '../../src/interfaces/WorkerProgressEnvelopeInterface.js';
import type { WorkerResultEnvelopeInterface } from '../../src/interfaces/WorkerResultEnvelopeInterface.js';

import { WorkerPool } from '../../src/WorkerPool.js';
import scenarioGroups from './hooks.scenarios.json';

interface ItemInterface {
  error?: string;
  value: string;
}

interface WorkerPoolInputInterface {
  concurrency?: WorkerPoolConfigInterface['concurrency'];
  workerPath: WorkerPoolConfigInterface['workerPath'];
}

interface ScenarioBaseInterface {
  description: string;
  name: string;
}

type ScenarioCase =
  | (ScenarioBaseInterface & {
      expected: { seenTypes: string[] };
      input: { items: ItemInterface[]; workerPool: WorkerPoolInputInterface };
      kind: 'on-message-envelopes';
    })
  | (ScenarioBaseInterface & {
      expected: { seenErrors: string[]; seenTypes: string[] };
      input: { items: ItemInterface[]; workerPool: WorkerPoolInputInterface };
      kind: 'error-envelope-and-hook';
    })
  | (ScenarioBaseInterface & {
      expected: { hookErrorCount: number; hookErrorMessages: string[]; results: string[] };
      input: { items: ItemInterface[]; workerPool: WorkerPoolInputInterface };
      kind: 'throwing-on-message';
    })
  | (ScenarioBaseInterface & {
      expected: { hookErrorCount: number; hookErrorMessages: string[]; rejectionEvents: unknown[]; results: string[] };
      input: { items: ItemInterface[]; workerPool: WorkerPoolInputInterface };
      kind: 'async-rejecting-on-message';
    })
  | (ScenarioBaseInterface & {
      expected: {
        firstHookErrorMessage: string;
        firstHookErrorName: string;
        firstHookErrorCount: number;
        firstResults: string[];
        secondHookErrorMessage: string;
        secondHookErrorName: string;
        secondHookErrorCount: number;
        secondResults: string[];
      };
      input: { firstItems: ItemInterface[]; secondItems: ItemInterface[]; workerPool: WorkerPoolInputInterface };
      kind: 'hook-errors-instance-local';
    });

function resolveWorkerPath(relativePath: string): string {
  return new URL(relativePath, import.meta.url).pathname;
}

function resolvePoolConfig(config: WorkerPoolInputInterface): WorkerPoolConfigInterface {
  const resolved: WorkerPoolConfigInterface = {
    workerPath: resolveWorkerPath(config.workerPath)
  };
  if (config.concurrency !== undefined) { resolved.concurrency = config.concurrency; }
  return resolved;
}

async function captureUnhandledRejections(scenarioName: string, action: () => Promise<void>): Promise<unknown[]> {
  const rejectionEvents: unknown[] = [];
  const onUnhandledRejection = (reason: unknown): void => {
    rejectionEvents.push(reason);
    console.error('[%s] captured unhandledRejection', scenarioName, reason);
  };

  process.on('unhandledRejection', onUnhandledRejection);
  try {
    await action();
    await new Promise((resolve) => { setImmediate(resolve); });
    await new Promise((resolve) => { setImmediate(resolve); });
    return rejectionEvents;
  } finally {
    process.off('unhandledRejection', onUnhandledRejection);
  }
}

const runnerMap: Record<ScenarioCase['kind'], (scenarioCase: ScenarioCase) => Promise<void>> = {
  'on-message-envelopes': async (scenarioCase) => {
    const seenTypes: string[] = [];

    class ObservingPool extends WorkerPool<ItemInterface, string> {
      protected override onMessage(envelope:
        | WorkerErrorEnvelopeInterface
        | WorkerLogEnvelopeInterface
        | WorkerProgressEnvelopeInterface
        | WorkerResultEnvelopeInterface<string>): void {
        seenTypes.push(envelope.type);
      }
    }

    const pool = ObservingPool.create(resolvePoolConfig(scenarioCase.input.workerPool));
    await pool.run(scenarioCase.input.items);
    assert.deepStrictEqual(seenTypes, scenarioCase.expected.seenTypes);
  },

  'error-envelope-and-hook': async (scenarioCase) => {
    const seenTypes: string[] = [];
    const seenErrors: string[] = [];

    class ObservingPool extends WorkerPool<ItemInterface, string> {
      protected override onMessage(envelope:
        | WorkerErrorEnvelopeInterface
        | WorkerLogEnvelopeInterface
        | WorkerProgressEnvelopeInterface
        | WorkerResultEnvelopeInterface<string>): void {
        seenTypes.push(envelope.type);
      }

      protected override onWorkerError(error: Error): void {
        seenErrors.push(error.message);
      }
    }

    const pool = ObservingPool.create(resolvePoolConfig(scenarioCase.input.workerPool));
    await assert.rejects(pool.run(scenarioCase.input.items), /kaboom/);
    assert.deepStrictEqual(seenTypes, scenarioCase.expected.seenTypes);
    assert.deepStrictEqual(seenErrors, scenarioCase.expected.seenErrors);
  },

  'throwing-on-message': async (scenarioCase) => {
    class ThrowingMessagePool extends WorkerPool<ItemInterface, string> {
      protected override onMessage(): void {
        throw new Error('hook boom');
      }
    }

    const pool = ThrowingMessagePool.create(resolvePoolConfig(scenarioCase.input.workerPool));
    assert.deepStrictEqual(await pool.run(scenarioCase.input.items), scenarioCase.expected.results);
    assert.equal(pool.getHookErrorCount(), scenarioCase.expected.hookErrorCount);
    assert.deepStrictEqual(pool.getHookErrors().map(({ hookName, cause }) => ({
      hookName,
      causeMessage: cause instanceof Error ? cause.message : String(cause)
    })), scenarioCase.expected.hookErrorMessages.map((hookErrorMessage) => ({
      hookName: 'onMessage',
      causeMessage: hookErrorMessage
    })));
  },

  'async-rejecting-on-message': async (scenarioCase) => {
    class AsyncRejectingMessagePool extends WorkerPool<ItemInterface, string> {
      protected override async onMessage(): Promise<void> {
        await Promise.resolve();
        throw new Error('async onMessage boom');
      }
    }

    const pool = AsyncRejectingMessagePool.create(resolvePoolConfig(scenarioCase.input.workerPool));
    const rejectionEvents = await captureUnhandledRejections(scenarioCase.kind, async () => {
      assert.deepStrictEqual(await pool.run(scenarioCase.input.items), scenarioCase.expected.results);
      assert.equal(pool.getHookErrorCount(), scenarioCase.expected.hookErrorCount);
      assert.deepStrictEqual(pool.getHookErrors().map(({ hookName, cause }) => ({
        hookName,
        causeMessage: cause instanceof Error ? cause.message : String(cause)
      })), scenarioCase.expected.hookErrorMessages.map((hookErrorMessage) => ({
        hookName: 'onMessage',
        causeMessage: hookErrorMessage
      })));
    });

    assert.deepStrictEqual(rejectionEvents, scenarioCase.expected.rejectionEvents);
  },

  'hook-errors-instance-local': async (scenarioCase) => {
    class FirstThrowingPool extends WorkerPool<ItemInterface, string> {
      static readonly hookCause = new Error('first pool hook failed');

      protected override onWorkerCreated(): void {
        throw FirstThrowingPool.hookCause;
      }
    }

    class SecondThrowingPool extends WorkerPool<ItemInterface, string> {
      static readonly hookCause = new Error('second pool hook failed');

      protected override onWorkerCreated(): void {
        throw SecondThrowingPool.hookCause;
      }
    }

    const first = FirstThrowingPool.create(resolvePoolConfig(scenarioCase.input.workerPool));
    const second = SecondThrowingPool.create(resolvePoolConfig(scenarioCase.input.workerPool));

    const [firstResults, secondResults] = await Promise.all([
      first.run(scenarioCase.input.firstItems),
      second.run(scenarioCase.input.secondItems)
    ]);

    const firstErrors = first.getHookErrors();
    const secondErrors = second.getHookErrors();
    assert.deepStrictEqual(firstResults, scenarioCase.expected.firstResults);
    assert.deepStrictEqual(secondResults, scenarioCase.expected.secondResults);
    assert.equal(first.getHookErrorCount(), scenarioCase.expected.firstHookErrorCount);
    assert.equal(second.getHookErrorCount(), scenarioCase.expected.secondHookErrorCount);
    assert.equal(firstErrors[0]?.hookName, scenarioCase.expected.firstHookErrorName);
    assert.equal(secondErrors[0]?.hookName, scenarioCase.expected.secondHookErrorName);
    assert.notStrictEqual(firstErrors[0]?.cause, FirstThrowingPool.hookCause);
    assert.notStrictEqual(secondErrors[0]?.cause, SecondThrowingPool.hookCause);
    assert.notStrictEqual(firstErrors[0], first.getHookErrors()[0]);
    assert.notStrictEqual(secondErrors[0], second.getHookErrors()[0]);
    assert.equal(firstErrors[0]?.cause instanceof Error && firstErrors[0].cause.message, scenarioCase.expected.firstHookErrorMessage);
    assert.equal(secondErrors[0]?.cause instanceof Error && secondErrors[0].cause.message, scenarioCase.expected.secondHookErrorMessage);
  }
};

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  await runnerMap[scenarioCase.kind](scenarioCase);
}

void describe('WorkerPool hooks', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
