import { RuntimeError, HookInvoker } from '@studnicky/errors/node';
import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';

import { BusQueue } from '../../src/BusQueue.js';
import type { BusQueueCreateOptionsInterface } from '../../src/interfaces/index.js';
import { BusQueueCreateOptionsEntity } from '../../src/entities/BusQueueCreateOptionsEntity.js';
import { BusQueueScenarioCaseEntity } from './entities/BusQueueScenarioCaseEntity.js';
import scenarioGroups from './BusQueue.scenarios.json' with { type: 'json' };

type ScenarioCase = BusQueueScenarioCaseEntity.Type;
type ScenarioShape = ScenarioCase['shape'];
type ScenarioItem = NonNullable<ScenarioCase['input']['items']>[number];

type ScenarioRunner = (scenarioCase: ScenarioCase) => Promise<void> | void;

type RunnerMap = { [K in ScenarioShape]: ScenarioRunner };

const fileIntake = ScenarioFileCompiler.compileIntake(BusQueueScenarioCaseEntity.Schema, BusQueueScenarioCaseEntity.Node);

function requireError(value: unknown): Error {
  if (!(value instanceof Error)) {
    throw RuntimeError.create('Expected an Error instance');
  }
  return value;
}

function requireDefined<TValue>(value: TValue | undefined, context: string): TValue {
  if (value === undefined) {
    throw RuntimeError.create(`Scenario ${context} is required`);
  }
  return value;
}

function requireNumber(value: ScenarioItem | undefined, context: string): number {
  if (typeof value !== 'number') {
    throw RuntimeError.create(`Scenario ${context} must be a number`);
  }
  return value;
}

function requireString(value: ScenarioItem | undefined, context: string): string {
  if (typeof value !== 'string') {
    throw RuntimeError.create(`Scenario ${context} must be a string`);
  }
  return value;
}

function expectedNumber(value: unknown, context: string): number {
  if (typeof value !== 'number') {
    throw RuntimeError.create(`Scenario expected.${context} must be a number`);
  }
  return value;
}


function expectedStringArray(value: unknown, context: string): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw RuntimeError.create(`Scenario expected.${context} must be a string array`);
  }
  return value;
}

function expectedArray(value: unknown, context: string): unknown[] {
  if (!Array.isArray(value)) {
    throw RuntimeError.create(`Scenario expected.${context} must be an array`);
  }
  return value;
}

function itemAt(items: readonly ScenarioItem[] | undefined, index: number): number {
  return requireNumber(items?.[index], `items[${index}]`);
}

function numberItems(items: readonly ScenarioItem[] | undefined): number[] {
  const required = requireDefined(items, 'items');
  return required.map((item, index) => requireNumber(item, `items[${index}]`));
}

function stringItems(items: readonly ScenarioItem[] | undefined): string[] {
  const required = requireDefined(items, 'items');
  return required.map((item, index) => requireString(item, `items[${index}]`));
}

const runnerMap: RunnerMap = {
    'handler-order': ({ expected, input }) => {
      const received: number[] = [];
      const queue = BusQueue.create<number>({ 'handler': async (item) => { received.push(item); } });
      for (const item of numberItems(input.items)) {
        void queue.enqueue(item);
      }
      return queue.drain().then(() => {
        assert.deepStrictEqual(received, expected.received);
      });
    },
    'drain-empty-immediate': ({ expected }) => {
      const queue = BusQueue.create<number>({ 'handler': async () => {} });
      return queue.drain().then(() => {
        assert.strictEqual(queue.size, expected.size);
      });
    },
    'missing-handler': ({ input }) => {
      assert.throws(() => { BusQueueCreateOptionsEntity.intake(input.options ?? {}); });
      return;
    },
    'size-before-drain': ({ expected, input }) => {
      const observedSizes: number[] = [];
      const queue = BusQueue.create<number>({
        'handler': async () => {
          observedSizes.push(queue.size);
        }
      });
      for (const item of numberItems(input.items)) {
        void queue.enqueue(item);
      }
      return queue.drain().then(() => {
        assert.deepStrictEqual(observedSizes, expected.observedSizes);
      });
    },
    'drain-empties': ({ expected, input }) => {
      const processed: string[] = [];
      const queue = BusQueue.create<string>({ 'handler': async (item) => { processed.push(item); } });
      for (const item of stringItems(input.items)) {
        void queue.enqueue(item);
      }
      return queue.drain().then(() => {
        assert.deepStrictEqual(processed, expected.processed);
        assert.strictEqual(queue.size, expected.size);
      });
    },
    'on-error-continues': ({ expected, input }) => {
      const errors: unknown[] = [];
      const received: number[] = [];
      const throwOn = requireDefined(input.throwOn, 'throwOn');
      const errorMessage = requireDefined(input.errorMessage, 'errorMessage');
      const queue = BusQueue.create<number>({
        'handler': async (item) => {
          if (item === throwOn) { throw RuntimeError.create(errorMessage); }
          received.push(item);
        },
        'onError': (err) => { errors.push(err); }
      });
      for (const item of numberItems(input.items)) {
        void queue.enqueue(item);
      }
      return queue.drain().then(() => {
        assert.deepStrictEqual(received, expected.received);
        assert.strictEqual(errors.length, expected.errorCount);
        assert.strictEqual(requireError(errors[0]).message, expected.errorMessage);
      });
    },
    'async-on-error-swallowed': ({ expected, input }) => {
      const throwOn = requireDefined(input.throwOn, 'throwOn');
      const handlerFailure = RuntimeError.create(requireDefined(input.handlerErrorMessage, 'handlerErrorMessage'));
      const onErrorFailure = RuntimeError.create(requireDefined(input.onErrorMessage, 'onErrorMessage'));
      const handlerErrors: unknown[] = [];
      const received: number[] = [];
      const unhandledRejections: unknown[] = [];
      const onUnhandledRejection = (reason: Error): void => { unhandledRejections.push(reason); };

      class ObservedQueue extends BusQueue<number> {
        static createObserved(options: BusQueueCreateOptionsInterface<number>): ObservedQueue {
          return new ObservedQueue(options);
        }
        protected override onHandlerError<TError>(error: TError): void {
          handlerErrors.push(error);
        }
      }

      process.on('unhandledRejection', onUnhandledRejection);
      const queue = ObservedQueue.createObserved({
        'handler': async (item) => {
          if (item === throwOn) { throw handlerFailure; }
          received.push(item);
        },
        'onError': async () => { throw onErrorFailure; }
      });
      for (const item of numberItems(input.items)) {
        void queue.enqueue(item);
      }
      return queue.drain()
        .then(() => new Promise<void>((resolve) => { setImmediate(resolve); }))
        .then(() => {
          assert.deepStrictEqual(handlerErrors.map((error) => requireError(error).message), expected.handlerErrors);
          assert.deepStrictEqual(received, expected.received);
          assert.strictEqual(unhandledRejections.length, expectedArray(expected.unhandledRejections, 'unhandledRejections').length);
        })
        .finally(() => {
          process.off('unhandledRejection', onUnhandledRejection);
        });
    },
    'abort-signal-cancels': ({ expected, input }) => {
      const received: number[] = [];
      const controller = new AbortController();
      const queue = BusQueue.create<number>({
        'handler': async (item) => { received.push(item); },
        'signal': controller.signal
      });
      void queue.enqueue(itemAt(input.items, 0));
      return queue.drain()
        .then(() => {
          controller.abort();
          for (const item of numberItems(input.items).slice(1)) {
            void queue.enqueue(item);
          }
        })
        .then(() => Promise.resolve())
        .then(() => {
          assert.deepStrictEqual(received, expected.received);
        });
    },
    'abort-initially-cancelled': ({ expected, input }) => {
      const dropped: number[] = [];
      class DropObservedQueue extends BusQueue<number> {
        static createDropObserved(options: BusQueueCreateOptionsInterface<number>): DropObservedQueue {
          return new DropObservedQueue(options);
        }
        protected override onDrop(): void {
          dropped.push(1);
        }
      }

      const controller = new AbortController();
      controller.abort();
      const queue = DropObservedQueue.createDropObserved({
        'handler': async (item) => { throw RuntimeError.create(`unexpected delivery: ${String(item)}`); },
        'signal': controller.signal
      });

      return queue.enqueue(requireNumber(input.item, 'item'))
        .then(() => queue.drain())
        .then(() => {
          assert.strictEqual(dropped.length, expected.dropped);
          assert.strictEqual(queue.size, expected.size);
        });
    },
    'abort-releases-pending': ({ expected, input }) => {
      const controller = new AbortController();
      const enqueueGate = Promise.withResolvers<void>();
      const enqueueStarted = Promise.withResolvers<void>();
      const received: number[] = [];

      class PendingEnqueueQueue extends BusQueue<number> {
        static createPending(options: BusQueueCreateOptionsInterface<number>): PendingEnqueueQueue {
          return new PendingEnqueueQueue(options);
        }
        protected override async onEnqueue(): Promise<void> {
          enqueueStarted.resolve();
          await enqueueGate.promise;
        }
      }

      const queue = PendingEnqueueQueue.createPending({
        'handler': async (item) => { received.push(item); },
        'signal': controller.signal
      });

      let pendingResolved = false;
      const enqueue = queue.enqueue(itemAt(input.items, 0)).then(() => { pendingResolved = true; });
      return enqueueStarted.promise
        .then(() => {
          controller.abort();
          return queue.drain();
        })
        .then(() => {
          assert.deepStrictEqual(received, expected.received);
          enqueueGate.resolve();
          return enqueue;
        })
        .then(() => {
          assert.strictEqual(pendingResolved, expected.pendingResolved);
        });
    },
    'abort-releases-drain-waiter': ({ expected, input }) => {
      const controller = new AbortController();
      const drainWaiter = Promise.withResolvers<void>();
      const received: number[] = [];

      const queue = BusQueue.create<number>({
        'handler': async (item) => { received.push(item); },
        'signal': controller.signal
      });

      void queue.enqueue(itemAt(input.items, 0));
      const draining = queue.drain().then(() => { drainWaiter.resolve(); });

      return Promise.resolve()
        .then(() => {
          controller.abort();
          return draining;
        })
        .then(() => drainWaiter.promise)
        .then(() => {
          assert.deepStrictEqual(received, expected.received);
        });
    },
    'abort-mid-drain-fires-exactly-once': ({ expected, input }) => {
      // Proves the lifecycle FSM's `releaseForAbort` effect fires exactly
      // once for an abort requested mid-drain: the in-flight item is left to
      // finish (its handler already started, so cancellation cannot un-run
      // it), every backpressure waiter is released so the still-pending
      // `enqueue()` calls settle rather than hang, both concurrent `drain()`
      // callers resolve exactly once each, and the loop does not go on to
      // start any further queued item (`draining` -> `aborting` stops the
      // loop before its next iteration).
      const controller = new AbortController();
      const dequeued: number[] = [];
      const received: number[] = [];
      const handlerGate = Promise.withResolvers<void>();
      const handlerStarted = Promise.withResolvers<void>();

      class ObservedQueue extends BusQueue<number> {
        static createObserved(options: BusQueueCreateOptionsInterface<number>): ObservedQueue {
          return new ObservedQueue(options);
        }
        protected override onDequeue(_depth: number): void {
          dequeued.push(1);
        }
      }

      const queue = ObservedQueue.createObserved({
        'handler': async (item) => {
          handlerStarted.resolve();
          await handlerGate.promise;
          received.push(item);
        },
        'highWaterMark': requireDefined(input.highWaterMark, 'highWaterMark'),
        'signal': controller.signal
      });

      const enqueues = numberItems(input.items).map((item) => queue.enqueue(item));

      let drainResolutions = 0;
      const drainA = queue.drain().then(() => { drainResolutions += 1; });
      const drainB = queue.drain().then(() => { drainResolutions += 1; });

      return handlerStarted.promise
        .then(() => {
          controller.abort();
          handlerGate.resolve();
          return Promise.all([drainA, drainB, ...enqueues]);
        })
        .then(() => {
          assert.strictEqual(dequeued.length, expected.dequeuedCount);
          assert.deepStrictEqual(received, expected.received);
          assert.strictEqual(drainResolutions, expected.drainResolutions);
        });
    },
    'on-drop-noop': ({ expected, input }) => {
      const dropped: number[] = [];
      class DropObservedQueue extends BusQueue<number> {
        static createDropObserved(options: BusQueueCreateOptionsInterface<number>): DropObservedQueue {
          return new DropObservedQueue(options);
        }
        protected override onDrop(): void {
          dropped.push(1);
        }
      }

      const controller = new AbortController();
      controller.abort();
      const queue = DropObservedQueue.createDropObserved({
        'handler': async (item) => { throw RuntimeError.create(`unexpected delivery: ${String(item)}`); },
        'signal': controller.signal
      });

      return queue.enqueue(requireNumber(input.item, 'item'))
        .then(() => queue.drain())
        .then(() => {
          assert.strictEqual(dropped.length, expected.dropped);
          assert.strictEqual(queue.size, expected.size);
        });
    },
    'high-water-mark-validation': ({ input }) => {
      for (const value of requireDefined(input.values, 'values')) {
        assert.throws(() => { BusQueueCreateOptionsEntity.intake({ 'handler': async () => {}, 'highWaterMark': value }); });
      }
      return;
    },
    'on-enqueue-hook': ({ expected, input }) => {
      const depths: number[] = [];
      class ObservedQueue extends BusQueue<number> {
        static createObserved(options: BusQueueCreateOptionsInterface<number>): ObservedQueue {
          return new ObservedQueue(options);
        }
        protected override onEnqueue(depth: number): void { depths.push(depth); }
      }
      const queue = ObservedQueue.createObserved({ 'handler': async () => {} });
      for (const item of numberItems(input.items)) {
        void queue.enqueue(item);
      }
      return queue.drain().then(() => {
        assert.deepStrictEqual(depths, expected.depths);
      });
    },
    'throwing-dequeue-hook': ({ expected, input }) => {
      const errors: unknown[] = [];
      const processed: number[] = [];
      const errorMessage = requireDefined(input.errorMessage, 'errorMessage');
      class ThrowingOnDequeueQueue extends BusQueue<number> {
        static createThrowing(options: BusQueueCreateOptionsInterface<number>): ThrowingOnDequeueQueue {
          return new ThrowingOnDequeueQueue(options);
        }
        #thrown = false;

        protected override onDequeue(_depth: number): void {
          if (this.#thrown) { return; }
          this.#thrown = true;
          throw RuntimeError.create(errorMessage);
        }
      }
      const queue = ThrowingOnDequeueQueue.createThrowing({
        'handler': async (item) => { processed.push(item); },
        'onError': (error) => { errors.push(error); }
      });
      void queue.enqueue(itemAt(input.items, 0));
      return Promise.resolve()
        .then(() => queue.enqueue(itemAt(input.items, 1)))
        .then(() => queue.drain())
        .then(() => {
          assert.deepStrictEqual(processed, expected.processed);
          assert.strictEqual(queue.size, 0);
          assert.strictEqual(errors.length, expected.errors);
        });
    },
    'rejecting-enqueue-hook': ({ expected, input }) => {
      const processed: number[] = [];
      const errorMessage = requireDefined(input.errorMessage, 'errorMessage');
      class ThrowingEnqueueQueue extends BusQueue<number> {
        static createThrowing(options: BusQueueCreateOptionsInterface<number>): ThrowingEnqueueQueue {
          return new ThrowingEnqueueQueue(options);
        }
        #attempt = 0;
        protected override async onEnqueue(): Promise<void> {
          this.#attempt += 1;
          if (this.#attempt === 1) {
            throw RuntimeError.create(errorMessage);
          }
        }
      }
      const queue = ThrowingEnqueueQueue.createThrowing({
        'handler': async (item) => { processed.push(item); }
      });
      return Promise.all(numberItems(input.items).map((item) => queue.enqueue(item)))
        .then(() => queue.drain())
        .then(() => {
          assert.deepStrictEqual(processed, expected.processed);
        });
    },
    'admission-hook-on-hook-error': ({ expected, input }) => {
      const seen: Array<{ 'hookName': string; 'cause': unknown }> = [];
      const failure = RuntimeError.create(requireDefined(input.errorMessage, 'errorMessage'));
      class RecordingHookInvoker extends HookInvoker {
        protected override onHookError(hookName: string, cause: Error): void {
          seen.push({ 'hookName': hookName, 'cause': cause });
        }
      }
      class RecordingHookErrorQueue extends BusQueue<number> {
        static createRecording(options: BusQueueCreateOptionsInterface<number>): RecordingHookErrorQueue {
          return new RecordingHookErrorQueue(options);
        }
        protected override readonly hooks: HookInvoker = new RecordingHookInvoker();
        protected override onEnqueue(): void {
          throw failure;
        }
      }
      const processed: number[] = [];
      const queue = RecordingHookErrorQueue.createRecording({
        'handler': async (item) => { processed.push(item); }
      });
      return queue.enqueue(itemAt(input.items, 0))
        .then(() => queue.drain())
        .then(() => {
          assert.deepStrictEqual(seen, [{ 'hookName': expected.hookName, 'cause': failure }]);
          assert.deepStrictEqual(processed, expected.processed);
        });
    },
    'rejecting-overflow-hook': ({ expected, input }) => {
      const processed: number[] = [];
      const errorMessage = requireDefined(input.errorMessage, 'errorMessage');
      class ThrowingOverflowQueue extends BusQueue<number> {
        static createThrowing(options: BusQueueCreateOptionsInterface<number>): ThrowingOverflowQueue {
          return new ThrowingOverflowQueue(options);
        }
        #attempt = 0;
        protected override async onOverflow(): Promise<void> {
          this.#attempt += 1;
          if (this.#attempt === 1) {
            throw RuntimeError.create(errorMessage);
          }
        }
      }
      const queue = ThrowingOverflowQueue.createThrowing({
        'handler': async (item) => { processed.push(item); },
        'highWaterMark': requireDefined(input.highWaterMark, 'highWaterMark')
      });
      return Promise.all(numberItems(input.items).map((item) => queue.enqueue(item)))
        .then(() => queue.drain())
        .then(() => {
          assert.deepStrictEqual(processed, expected.processed);
        });
    },
    'single-drain-loop': ({ expected, input }) => {
      let activeHandlers = 0;
      let maxConcurrentHandlers = 0;
      const processed: number[] = [];
      let resolveFirst!: () => void;
      const firstBlocked = new Promise<void>((resolve) => { resolveFirst = resolve; });
      const queue = BusQueue.create<number>({
        'handler': async (item) => {
          activeHandlers += 1;
          maxConcurrentHandlers = Math.max(maxConcurrentHandlers, activeHandlers);
          if (item === itemAt(input.items, 0)) { await firstBlocked; }
          processed.push(item);
          activeHandlers -= 1;
        }
      });
      const first = queue.enqueue(itemAt(input.items, 0));
      const second = queue.enqueue(itemAt(input.items, 1));
      resolveFirst();
      return Promise.all([first, second]).then(() => queue.drain()).then(() => {
        assert.strictEqual(maxConcurrentHandlers, expected.maxConcurrentHandlers);
        assert.deepStrictEqual(processed, expected.processed);
      });
    },
    'fifo-order': ({ expected, input }) => {
      const received: number[] = [];
      const queue = BusQueue.create<number>({ 'handler': async (item) => { received.push(item); } });
      const total = requireDefined(input.total, 'total');
      for (let i = 0; i < total; i += 1) {
        void queue.enqueue(i);
      }
      return queue.drain().then(() => {
        assert.strictEqual(received.length, expected.receivedCount);
        assert.strictEqual(received[0], expected.first);
        assert.strictEqual(received.at(-1), expected.last);
      });
    },
    'overflow-hook-fires': ({ expected, input }) => {
      const overflowDepths: number[] = [];
      let resolveBlock!: () => void;
      const blockFirst = new Promise<void>((resolve) => { resolveBlock = resolve; });
      let first = true;
      class ObservedQueue extends BusQueue<number> {
        static createObserved(options: BusQueueCreateOptionsInterface<number>): ObservedQueue {
          return new ObservedQueue(options);
        }
        protected override onOverflow(depth: number): void { overflowDepths.push(depth); }
      }
      const queue = ObservedQueue.createObserved({
        'handler': async () => {
          if (first) {
            first = false;
            await blockFirst;
          }
        },
        'highWaterMark': requireDefined(input.highWaterMark, 'highWaterMark')
      });
      for (const item of numberItems(input.items)) {
        void queue.enqueue(item);
      }
      return flushMicrotasks(requireDefined(input.flushMicrotasks, 'flushMicrotasks'))
        .then(() => {
          resolveBlock();
        })
        .then(() => queue.drain())
        .then(() => {
          assert.strictEqual(overflowDepths.length >= expectedNumber(expected.overflowDepthsAtLeast, 'overflowDepthsAtLeast'), true);
        });
    },
    'admission-and-overflow-order': ({ expected, input }) => {
      const enqueueGate = Promise.withResolvers<void>();
      const enqueueStarted = Promise.withResolvers<void>();
      const overflowGate = Promise.withResolvers<void>();
      const overflowStarted = Promise.withResolvers<void>();
      const order: string[] = [];
      class PendingAdmissionQueue extends BusQueue<number> {
        static createPending(options: BusQueueCreateOptionsInterface<number>): PendingAdmissionQueue {
          return new PendingAdmissionQueue(options);
        }
        protected override async onEnqueue(): Promise<void> {
          order.push('enqueue:start');
          enqueueStarted.resolve();
          await enqueueGate.promise;
          order.push('enqueue:end');
        }

        protected override async onOverflow(): Promise<void> {
          order.push('overflow:start');
          overflowStarted.resolve();
          await overflowGate.promise;
          order.push('overflow:end');
        }
      }
      const queue = PendingAdmissionQueue.createPending({
        'handler': async () => { order.push('handler'); },
        'highWaterMark': requireDefined(input.highWaterMark, 'highWaterMark')
      });
      const enqueue = queue.enqueue(itemAt(input.items, 0));
      const expectedOrder = expectedStringArray(expected.order, 'order');
      return enqueueStarted.promise
        .then(() => {
          assert.deepStrictEqual(order, expectedOrder.slice(0, 1));
          enqueueGate.resolve();
          return overflowStarted.promise;
        })
        .then(() => {
          assert.deepStrictEqual(order, expectedOrder.slice(0, 3));
          overflowGate.resolve();
          return enqueue;
        })
        .then(() => queue.drain())
        .then(() => {
          assert.deepStrictEqual(order, expected.order);
        });
    },
    'handler-error-hook': ({ expected, input }) => {
      const errors: unknown[] = [];
      class ObservedQueue extends BusQueue<number> {
        static createObserved(options: BusQueueCreateOptionsInterface<number>): ObservedQueue {
          return new ObservedQueue(options);
        }
        protected override onHandlerError<TError>(err: TError): void { errors.push(err); }
      }
      const queue = ObservedQueue.createObserved({
        'handler': async () => { throw RuntimeError.create(requireDefined(input.errorMessage, 'errorMessage')); }
      });
      return queue.enqueue(itemAt(input.items, 0))
        .then(() => queue.drain())
        .then(() => {
          assert.strictEqual(errors.length, expected.errors);
          assert.strictEqual(requireError(errors[0]).message, expected.errorMessage);
        });
    }
};

function flushMicrotasks(times: number): Promise<void> {
  let chain = Promise.resolve();
  for (let i = 0; i < times; i += 1) {
    chain = chain.then(() => Promise.resolve());
  }
  return chain;
}

function runCase(scenarioCase: ScenarioCase): Promise<void> | void {
  return runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('BusQueue', () => {
  for (const scenarioCase of fileIntake(scenarioGroups).cases) {
    void it(scenarioCase.name, async () => {
      await runCase(scenarioCase);
    });
  }
});
