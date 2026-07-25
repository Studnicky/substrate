import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { HookInvoker } from '@studnicky/errors';

import { BusQueue } from '../../src/BusQueue.js';
import type { BusQueueCreateOptionsInterface } from '../../src/BusQueueCreateOptionsInterface.js';
import scenarioGroups from './BusQueue.scenarios.json';

type ScenarioKind =
  | 'admission-and-overflow-order'
  | 'admission-hook-on-hook-error'
  | 'abort-initially-cancelled'
  | 'abort-releases-drain-waiter'
  | 'abort-releases-pending'
  | 'abort-signal-cancels'
  | 'async-on-error-swallowed'
  | 'drain-empty-immediate'
  | 'drain-empties'
  | 'fifo-order'
  | 'handler-error-hook'
  | 'handler-order'
  | 'high-water-mark-validation'
  | 'missing-handler'
  | 'on-drop-noop'
  | 'on-enqueue-hook'
  | 'on-error-continues'
  | 'overflow-hook-fires'
  | 'rejecting-enqueue-hook'
  | 'rejecting-overflow-hook'
  | 'single-drain-loop'
  | 'size-before-drain'
  | 'throwing-dequeue-hook';

type ScenarioCase<K extends ScenarioKind = ScenarioKind> = {
  description: string;
  expected: Record<string, unknown>;
  input: Record<string, unknown>;
  kind: K;
  name: string;
};

type ScenarioRunContext<K extends ScenarioKind> = {
  expected: ScenarioCase<K>['expected'];
  input: ScenarioCase<K>['input'];
};

type ScenarioRunner<K extends ScenarioKind> = (context: ScenarioRunContext<K>) => Promise<void> | void;

type RunnerMap = { [K in ScenarioKind]: ScenarioRunner<K> };

const runnerMap: RunnerMap = {
    'handler-order': ({ expected, input }) => {
      const received: number[] = [];
      const queue = BusQueue.create<number>({ 'handler': async (item) => { received.push(item); } });
      for (const item of input.items as number[]) {
        void queue.enqueue(item);
      }
      return queue.drain().then(() => {
        assert.deepStrictEqual(received, expected.received);
      });
    },
    'drain-empty-immediate': ({ expected }) => {
      const queue = BusQueue.create<number>({ 'handler': async () => {} });
      return queue.drain().then(() => {
        assert.strictEqual(queue.size, expected.size as number);
      });
    },
    'missing-handler': ({ expected, input }) => {
      assert.throws(
        () => Reflect.apply(BusQueue.create, BusQueue, [input.options ?? {}]),
        { message: expected.message as string }
      );
      return;
    },
    'size-before-drain': ({ expected, input }) => {
      const observedSizes: number[] = [];
      const queue = BusQueue.create<number>({
        'handler': async () => {
          observedSizes.push(queue.size);
        }
      });
      for (const item of input.items as number[]) {
        void queue.enqueue(item);
      }
      return queue.drain().then(() => {
        assert.deepStrictEqual(observedSizes, expected.observedSizes);
      });
    },
    'drain-empties': ({ expected, input }) => {
      const processed: string[] = [];
      const queue = BusQueue.create<string>({ 'handler': async (item) => { processed.push(item); } });
      for (const item of input.items as string[]) {
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
      const queue = BusQueue.create<number>({
        'handler': async (item) => {
          if (item === (input.throwOn as number)) { throw new Error(input.errorMessage as string); }
          received.push(item);
        },
        'onError': (err) => { errors.push(err); }
      });
      for (const item of input.items as number[]) {
        void queue.enqueue(item);
      }
      return queue.drain().then(() => {
        assert.deepStrictEqual(received, expected.received);
        assert.strictEqual(errors.length, expected.errorCount);
        assert.strictEqual((errors[0] as Error).message, expected.errorMessage);
      });
    },
    'async-on-error-swallowed': ({ expected, input }) => {
      const handlerFailure = new Error(input.handlerErrorMessage as string);
      const onErrorFailure = new Error(input.onErrorMessage as string);
      const handlerErrors: unknown[] = [];
      const received: number[] = [];
      const unhandledRejections: unknown[] = [];
      const onUnhandledRejection = (reason: unknown): void => { unhandledRejections.push(reason); };

      class ObservedQueue extends BusQueue<number> {
        protected override onHandlerError(error: unknown): void {
          handlerErrors.push(error);
        }
      }

      process.on('unhandledRejection', onUnhandledRejection);
      const queue = ObservedQueue.create({
        'handler': async (item) => {
          if (item === (input.throwOn as number)) { throw handlerFailure; }
          received.push(item);
        },
        'onError': async () => { throw onErrorFailure; }
      });
      for (const item of input.items as number[]) {
        void queue.enqueue(item);
      }
      return queue.drain()
        .then(() => new Promise<void>((resolve) => { setImmediate(resolve); }))
        .then(() => {
          assert.deepStrictEqual(handlerErrors.map((error) => (error as Error).message), expected.handlerErrors);
          assert.deepStrictEqual(received, expected.received);
          assert.strictEqual(unhandledRejections.length, expected.unhandledRejections.length);
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
      void queue.enqueue((input.items as number[])[0]);
      return queue.drain()
        .then(() => {
          controller.abort();
          for (const item of (input.items as number[]).slice(1)) {
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
        protected override onDrop(): void {
          dropped.push(1);
        }
      }

      const controller = new AbortController();
      controller.abort();
      const queue = DropObservedQueue.create({
        'handler': async (item) => { throw new Error(`unexpected delivery: ${String(item)}`); },
        'signal': controller.signal
      });

      return queue.enqueue(input.item as number)
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
        protected override async onEnqueue(): Promise<void> {
          enqueueStarted.resolve();
          await enqueueGate.promise;
        }
      }

      const queue = PendingEnqueueQueue.create({
        'handler': async (item) => { received.push(item); },
        'signal': controller.signal
      });

      const enqueue = queue.enqueue((input.items as number[])[0]);
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
          assert.strictEqual(expected.pendingResolved, true);
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

      void queue.enqueue((input.items as number[])[0]);
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
    'on-drop-noop': ({ expected, input }) => {
      const dropped: number[] = [];
      class DropObservedQueue extends BusQueue<number> {
        protected override onDrop(): void {
          dropped.push(1);
        }
      }

      const controller = new AbortController();
      controller.abort();
      const queue = DropObservedQueue.create({
        'handler': async (item) => { throw new Error(`unexpected delivery: ${String(item)}`); },
        'signal': controller.signal
      });

      return queue.enqueue(input.item as number)
        .then(() => queue.drain())
        .then(() => {
          assert.strictEqual(dropped.length, expected.dropped);
          assert.strictEqual(queue.size, expected.size);
        });
    },
    'high-water-mark-validation': ({ expected, input }) => {
      for (const value of input.values as number[]) {
        assert.throws(
          () => BusQueue.create<number>({ 'handler': async () => {}, 'highWaterMark': value }),
          { message: expected.message as string }
        );
      }
      return;
    },
    'on-enqueue-hook': ({ expected, input }) => {
      const depths: number[] = [];
      class ObservedQueue extends BusQueue<number> {
        static override create(options: BusQueueCreateOptionsInterface<number>): ObservedQueue {
          return new ObservedQueue(options);
        }
        protected override onEnqueue(depth: number): void { depths.push(depth); }
      }
      const queue = ObservedQueue.create({ 'handler': async () => {} });
      for (const item of input.items as number[]) {
        void queue.enqueue(item);
      }
      return queue.drain().then(() => {
        assert.deepStrictEqual(depths, expected.depths);
      });
    },
    'throwing-dequeue-hook': ({ expected, input }) => {
      const errors: unknown[] = [];
      const processed: number[] = [];
      class ThrowingOnDequeueQueue extends BusQueue<number> {
        static override create(options: BusQueueCreateOptionsInterface<number>): ThrowingOnDequeueQueue {
          return new ThrowingOnDequeueQueue(options);
        }

        #thrown = false;

        protected override onDequeue(_depth: number): void {
          if (this.#thrown) { return; }
          this.#thrown = true;
          throw new Error(input.errorMessage as string);
        }
      }
      const queue = ThrowingOnDequeueQueue.create<number>({
        'handler': async (item) => { processed.push(item); },
        'onError': (error) => { errors.push(error); }
      });
      void queue.enqueue((input.items as number[])[0]);
      return Promise.resolve()
        .then(() => queue.enqueue((input.items as number[])[1]))
        .then(() => queue.drain())
        .then(() => {
          assert.deepStrictEqual(processed, expected.processed);
          assert.strictEqual(queue.size, 0);
          assert.strictEqual(errors.length, expected.errors);
        });
    },
    'rejecting-enqueue-hook': ({ expected, input }) => {
      const processed: number[] = [];
      class ThrowingEnqueueQueue extends BusQueue<number> {
        #attempt = 0;
        protected override async onEnqueue(): Promise<void> {
          this.#attempt += 1;
          if (this.#attempt === 1) {
            throw new Error(input.errorMessage as string);
          }
        }
      }
      const queue = ThrowingEnqueueQueue.create({
        'handler': async (item) => { processed.push(item); }
      });
      return Promise.all((input.items as number[]).map((item) => queue.enqueue(item)))
        .then(() => queue.drain())
        .then(() => {
          assert.deepStrictEqual(processed, expected.processed);
        });
    },
    'admission-hook-on-hook-error': ({ expected, input }) => {
      const seen: Array<{ 'hookName': string; 'cause': unknown }> = [];
      const failure = new Error(input.errorMessage as string);
      class RecordingHookInvoker extends HookInvoker {
        protected override onHookError(hookName: string, cause: unknown): void {
          seen.push({ 'hookName': hookName, 'cause': cause });
        }
      }
      class RecordingHookErrorQueue extends BusQueue<number> {
        protected override readonly hooks: HookInvoker = new RecordingHookInvoker();
        protected override onEnqueue(): void {
          throw failure;
        }
      }
      const processed: number[] = [];
      const queue = RecordingHookErrorQueue.create({
        'handler': async (item) => { processed.push(item); }
      });
      return queue.enqueue((input.items as number[])[0])
        .then(() => queue.drain())
        .then(() => {
          assert.deepStrictEqual(seen, [{ 'hookName': expected.hookName as string, 'cause': failure }]);
          assert.deepStrictEqual(processed, expected.processed);
        });
    },
    'rejecting-overflow-hook': ({ expected, input }) => {
      const processed: number[] = [];
      class ThrowingOverflowQueue extends BusQueue<number> {
        #attempt = 0;
        protected override async onOverflow(): Promise<void> {
          this.#attempt += 1;
          if (this.#attempt === 1) {
            throw new Error(input.errorMessage as string);
          }
        }
      }
      const queue = ThrowingOverflowQueue.create({
        'handler': async (item) => { processed.push(item); },
        'highWaterMark': input.highWaterMark as number
      });
      return Promise.all((input.items as number[]).map((item) => queue.enqueue(item)))
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
          if (item === (input.items as number[])[0]) { await firstBlocked; }
          processed.push(item);
          activeHandlers -= 1;
        }
      });
      const first = queue.enqueue((input.items as number[])[0]);
      const second = queue.enqueue((input.items as number[])[1]);
      resolveFirst();
      return Promise.all([first, second]).then(() => queue.drain()).then(() => {
        assert.strictEqual(maxConcurrentHandlers, expected.maxConcurrentHandlers as number);
        assert.deepStrictEqual(processed, expected.processed);
      });
    },
    'fifo-order': ({ expected, input }) => {
      const received: number[] = [];
      const queue = BusQueue.create<number>({ 'handler': async (item) => { received.push(item); } });
      for (let i = 0; i < (input.total as number); i += 1) {
        void queue.enqueue(i);
      }
      return queue.drain().then(() => {
        assert.strictEqual(received.length, expected.receivedCount as number);
        assert.strictEqual(received[0], expected.first as number);
        assert.strictEqual(received.at(-1), expected.last as number);
      });
    },
    'overflow-hook-fires': ({ expected, input }) => {
      const overflowDepths: number[] = [];
      let resolveBlock!: () => void;
      const blockFirst = new Promise<void>((resolve) => { resolveBlock = resolve; });
      let first = true;
      class ObservedQueue extends BusQueue<number> {
        protected override onOverflow(depth: number): void { overflowDepths.push(depth); }
      }
      const queue = ObservedQueue.create({
        'handler': async () => {
          if (first) {
            first = false;
            await blockFirst;
          }
        },
        'highWaterMark': input.highWaterMark as number
      });
      for (const item of input.items as number[]) {
        void queue.enqueue(item);
      }
      return flushMicrotasks(input.flushMicrotasks as number)
        .then(() => {
          resolveBlock();
        })
        .then(() => queue.drain())
        .then(() => {
          assert.strictEqual(overflowDepths.length >= (expected.overflowDepthsAtLeast as number), true);
        });
    },
    'admission-and-overflow-order': ({ expected, input }) => {
      const enqueueGate = Promise.withResolvers<void>();
      const enqueueStarted = Promise.withResolvers<void>();
      const overflowGate = Promise.withResolvers<void>();
      const overflowStarted = Promise.withResolvers<void>();
      const order: string[] = [];
      class PendingAdmissionQueue extends BusQueue<number> {
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
      const queue = PendingAdmissionQueue.create({
        'handler': async () => { order.push('handler'); },
        'highWaterMark': input.highWaterMark as number
      });
      const enqueue = queue.enqueue((input.items as number[])[0]);
      return enqueueStarted.promise
        .then(() => {
          assert.deepStrictEqual(order, (expected.order as string[]).slice(0, 1));
          enqueueGate.resolve();
          return overflowStarted.promise;
        })
        .then(() => {
          assert.deepStrictEqual(order, (expected.order as string[]).slice(0, 3));
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
        protected override onHandlerError(err: unknown): void { errors.push(err); }
      }
      const queue = ObservedQueue.create({
        'handler': async () => { throw new Error(input.errorMessage as string); }
      });
      return queue.enqueue((input.items as number[])[0])
        .then(() => queue.drain())
        .then(() => {
          assert.strictEqual(errors.length, expected.errors as number);
          assert.strictEqual((errors[0] as Error).message, expected.errorMessage as string);
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

function runCase<K extends ScenarioKind>(scenarioCase: ScenarioCase<K>): Promise<void> | void {
  return runnerMap[scenarioCase.kind]({
    'expected': scenarioCase.expected,
    'input': scenarioCase.input
  });
}

void describe('BusQueue', () => {
  for (const scenario of scenarioGroups.cases) {
    void it(scenario.name, async () => {
      await runCase(scenario as ScenarioCase);
    });
  }
});
