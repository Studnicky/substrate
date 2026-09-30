import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { HookInvoker, RuntimeError } from '@studnicky/errors/node';
import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import type { BusQueueCreateOptionsInterface } from '../../src/interfaces/index.js';

import { BusQueue } from '../../src/BusQueue.js';
import { BusQueueCreateOptionsEntity } from '../../src/entities/BusQueueCreateOptionsEntity.js';
import scenarioGroups from './BusQueue.scenarios.json' with { 'type': 'json' };
import { BusQueueScenarioCaseEntity } from './entities/BusQueueScenarioCaseEntity.js';

class BusQueueRunners {
  static async 'abort-initially-cancelled'(scenarioCase: ScenarioCaseOfType<BusQueueScenarioCaseEntity.Type, 'abort-initially-cancelled'>): Promise<void> {
    await BusQueueRunners.runDropObserved(scenarioCase);
  }

  static async 'abort-mid-drain-fires-exactly-once'(scenarioCase: ScenarioCaseOfType<BusQueueScenarioCaseEntity.Type, 'abort-mid-drain-fires-exactly-once'>): Promise<void> {
    // Proves the lifecycle FSM's `releaseForAbort` effect fires exactly
    // once for an abort requested mid-drain: the in-flight item is left to
    // finish (its handler already started, so cancellation cannot un-run
    // it), every backpressure waiter is released so the still-pending
    // `enqueue()` calls settle rather than hang, both concurrent `drain()`
    // callers resolve exactly once each, and the loop does not go on to
    // start any further queued item (`draining` -> `aborting` stops the
    // loop before its next iteration).
    const { expected, input } = scenarioCase;
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
      'highWaterMark': BusQueueRunners.requireDefined(input.highWaterMark, 'highWaterMark'),
      'signal': controller.signal
    });

    const enqueues = BusQueueRunners.numberItems(input.items).map((item) => {
      const pending = queue.enqueue(item);
      return pending;
    });

    let drainResolutions = 0;
    const drainA = queue.drain().then(() => { drainResolutions += 1; });
    const drainB = queue.drain().then(() => { drainResolutions += 1; });

    await handlerStarted.promise;
    controller.abort(RuntimeError.create('abort mid-drain'));
    handlerGate.resolve();
    await Promise.all([drainA, drainB, ...enqueues]);

    assert.strictEqual(dequeued.length, expected.dequeuedCount);
    assert.deepStrictEqual(received, expected.received);
    assert.strictEqual(drainResolutions, expected.drainResolutions);
  }

  static async 'abort-releases-drain-waiter'(scenarioCase: ScenarioCaseOfType<BusQueueScenarioCaseEntity.Type, 'abort-releases-drain-waiter'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const controller = new AbortController();
    const drainWaiter = Promise.withResolvers<void>();
    const received: number[] = [];

    const queue = BusQueue.create<number>({
      'handler': BusQueueRunners.recorder(received),
      'signal': controller.signal
    });

    void queue.enqueue(BusQueueRunners.itemAt(input.items, 0));
    const draining = queue.drain().then(() => { drainWaiter.resolve(); });

    await Promise.resolve();
    controller.abort(RuntimeError.create('abort while draining'));
    await draining;
    await drainWaiter.promise;

    assert.deepStrictEqual(received, expected.received);
  }

  static async 'abort-releases-pending'(scenarioCase: ScenarioCaseOfType<BusQueueScenarioCaseEntity.Type, 'abort-releases-pending'>): Promise<void> {
    const { expected, input } = scenarioCase;
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
      'handler': BusQueueRunners.recorder(received),
      'signal': controller.signal
    });

    let pendingResolved = false;
    const enqueue = queue.enqueue(BusQueueRunners.itemAt(input.items, 0)).then(() => { pendingResolved = true; });
    await enqueueStarted.promise;
    controller.abort(RuntimeError.create('abort while enqueue pending'));
    await queue.drain();
    assert.deepStrictEqual(received, expected.received);
    enqueueGate.resolve();
    await enqueue;
    assert.strictEqual(pendingResolved, expected.pendingResolved);
  }

  static async 'abort-signal-cancels'(scenarioCase: ScenarioCaseOfType<BusQueueScenarioCaseEntity.Type, 'abort-signal-cancels'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const received: number[] = [];
    const controller = new AbortController();
    const queue = BusQueue.create<number>({
      'handler': BusQueueRunners.recorder(received),
      'signal': controller.signal
    });
    void queue.enqueue(BusQueueRunners.itemAt(input.items, 0));
    await queue.drain();
    controller.abort(RuntimeError.create('abort after first drain'));
    BusQueueRunners.enqueueAll(queue, BusQueueRunners.numberItems(input.items).slice(1));
    await Promise.resolve();
    await Promise.resolve();
    assert.deepStrictEqual(received, expected.received);
  }

  static async 'admission-and-overflow-order'(scenarioCase: ScenarioCaseOfType<BusQueueScenarioCaseEntity.Type, 'admission-and-overflow-order'>): Promise<void> {
    const { expected, input } = scenarioCase;
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
      'handler': BusQueueRunners.valueRecorder(order, 'handler'),
      'highWaterMark': BusQueueRunners.requireDefined(input.highWaterMark, 'highWaterMark')
    });
    const enqueue = queue.enqueue(BusQueueRunners.itemAt(input.items, 0));
    const expectedOrder = BusQueueRunners.expectedStringArray(expected.order, 'order');
    await enqueueStarted.promise;
    assert.deepStrictEqual(order, expectedOrder.slice(0, 1));
    enqueueGate.resolve();
    await overflowStarted.promise;
    assert.deepStrictEqual(order, expectedOrder.slice(0, 3));
    overflowGate.resolve();
    await enqueue;
    await queue.drain();
    assert.deepStrictEqual(order, expected.order);
  }

  static async 'admission-hook-on-hook-error'(scenarioCase: ScenarioCaseOfType<BusQueueScenarioCaseEntity.Type, 'admission-hook-on-hook-error'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const seen: { 'cause': unknown; 'hookName': string; }[] = [];
    const failure = RuntimeError.create(BusQueueRunners.requireDefined(input.errorMessage, 'errorMessage'));
    class RecordingHookInvoker extends HookInvoker {
      protected override onHookError(hookName: string, cause: Error): void {
        seen.push({ 'cause': cause, 'hookName': hookName });
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
      'handler': BusQueueRunners.recorder(processed)
    });
    await queue.enqueue(BusQueueRunners.itemAt(input.items, 0));
    await queue.drain();
    assert.deepStrictEqual(seen, [{ 'cause': failure, 'hookName': expected.hookName }]);
    assert.deepStrictEqual(processed, expected.processed);
  }

  static async 'async-on-error-swallowed'(scenarioCase: ScenarioCaseOfType<BusQueueScenarioCaseEntity.Type, 'async-on-error-swallowed'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const throwOn = BusQueueRunners.requireDefined(input.throwOn, 'throwOn');
    const handlerFailure = RuntimeError.create(BusQueueRunners.requireDefined(input.handlerErrorMessage, 'handlerErrorMessage'));
    const onErrorFailure = RuntimeError.create(BusQueueRunners.requireDefined(input.onErrorMessage, 'onErrorMessage'));
    const handlerErrors: unknown[] = [];
    const received: number[] = [];
    const unhandledRejections: unknown[] = [];
    const onUnhandledRejection = (reason: Error): void => { unhandledRejections.push(reason); };

    class ObservedQueue extends BusQueue<number> {
      static createObserved(options: BusQueueCreateOptionsInterface<number>): ObservedQueue {
        return new ObservedQueue(options);
      }
      protected override onHandlerError(error: unknown): void {
        handlerErrors.push(error);
      }
    }

    process.on('unhandledRejection', onUnhandledRejection);
    try {
      const recordReceived = BusQueueRunners.recorder(received);
      const handler = (item: number): Promise<void> => {
        if (item === throwOn) {
          const failed = Promise.reject(handlerFailure);
          return failed;
        }
        const recorded = recordReceived(item);
        return recorded;
      };
      const onError = (): void => { throw onErrorFailure; };
      const queue = ObservedQueue.createObserved({ 'handler': handler, 'onError': onError });
      BusQueueRunners.enqueueAll(queue, BusQueueRunners.numberItems(input.items));
      await queue.drain();
      await new Promise<void>((resolve) => { setImmediate(resolve); });
      assert.deepStrictEqual(handlerErrors.map((error) => {
        const message = BusQueueRunners.requireError(error).message;
        return message;
      }), expected.handlerErrors);
      assert.deepStrictEqual(received, expected.received);
      assert.strictEqual(unhandledRejections.length, BusQueueRunners.expectedArray(expected.unhandledRejections, 'unhandledRejections').length);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  }

  static async 'drain-empties'(scenarioCase: ScenarioCaseOfType<BusQueueScenarioCaseEntity.Type, 'drain-empties'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const processed: string[] = [];
    const queue = BusQueue.create<string>({ 'handler': BusQueueRunners.recorder(processed) });
    BusQueueRunners.enqueueAll(queue, BusQueueRunners.stringItems(input.items));
    await queue.drain();
    assert.deepStrictEqual(processed, expected.processed);
    assert.strictEqual(queue.size, expected.size);
  }

  static async 'drain-empty-immediate'(scenarioCase: ScenarioCaseOfType<BusQueueScenarioCaseEntity.Type, 'drain-empty-immediate'>): Promise<void> {
    const { expected } = scenarioCase;
    const queue = BusQueue.create<number>({ 'handler': BusQueueRunners.recorder<number>([]) });
    await queue.drain();
    assert.strictEqual(queue.size, expected.size);
  }

  static async 'fifo-order'(scenarioCase: ScenarioCaseOfType<BusQueueScenarioCaseEntity.Type, 'fifo-order'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const received: number[] = [];
    const queue = BusQueue.create<number>({ 'handler': BusQueueRunners.recorder(received) });
    const total = BusQueueRunners.requireDefined(input.total, 'total');
    for (let i = 0; i < total; i += 1) {
      void queue.enqueue(i);
    }
    await queue.drain();
    assert.strictEqual(received.length, expected.receivedCount);
    assert.strictEqual(received[0], expected.first);
    assert.strictEqual(received.at(-1), expected.last);
  }

  static async 'handler-error-hook'(scenarioCase: ScenarioCaseOfType<BusQueueScenarioCaseEntity.Type, 'handler-error-hook'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const errors: unknown[] = [];
    class ObservedQueue extends BusQueue<number> {
      static createObserved(options: BusQueueCreateOptionsInterface<number>): ObservedQueue {
        return new ObservedQueue(options);
      }
      protected override onHandlerError(error: unknown): void { errors.push(error); }
    }
    const queue = ObservedQueue.createObserved({
      'handler': () => {
        const failed = Promise.reject(RuntimeError.create(BusQueueRunners.requireDefined(input.errorMessage, 'errorMessage')));
        return failed;
      }
    });
    await queue.enqueue(BusQueueRunners.itemAt(input.items, 0));
    await queue.drain();
    assert.strictEqual(errors.length, expected.errors);
    assert.strictEqual(BusQueueRunners.requireError(errors[0]).message, expected.errorMessage);
  }

  static async 'handler-order'(scenarioCase: ScenarioCaseOfType<BusQueueScenarioCaseEntity.Type, 'handler-order'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const received: number[] = [];
    const queue = BusQueue.create<number>({ 'handler': BusQueueRunners.recorder(received) });
    BusQueueRunners.enqueueAll(queue, BusQueueRunners.numberItems(input.items));
    await queue.drain();
    assert.deepStrictEqual(received, expected.received);
  }

  static 'high-water-mark-validation'(scenarioCase: ScenarioCaseOfType<BusQueueScenarioCaseEntity.Type, 'high-water-mark-validation'>): void {
    const { input } = scenarioCase;
    const values = BusQueueRunners.requireDefined(input.values, 'values');
    for (let index = 0; index < values.length; index += 1) {
      const value = values[index];
      assert.throws(() => { BusQueueCreateOptionsEntity.intake({ 'handler': BusQueueRunners.recorder<number>([]), 'highWaterMark': value }); });
    }
  }

  static 'missing-handler'(scenarioCase: ScenarioCaseOfType<BusQueueScenarioCaseEntity.Type, 'missing-handler'>): void {
    const { input } = scenarioCase;
    assert.throws(() => { BusQueueCreateOptionsEntity.intake(input.options ?? {}); });
  }

  static async 'on-drop-noop'(scenarioCase: ScenarioCaseOfType<BusQueueScenarioCaseEntity.Type, 'on-drop-noop'>): Promise<void> {
    await BusQueueRunners.runDropObserved(scenarioCase);
  }

  static async 'on-enqueue-hook'(scenarioCase: ScenarioCaseOfType<BusQueueScenarioCaseEntity.Type, 'on-enqueue-hook'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const depths: number[] = [];
    class ObservedQueue extends BusQueue<number> {
      static createObserved(options: BusQueueCreateOptionsInterface<number>): ObservedQueue {
        return new ObservedQueue(options);
      }
      protected override onEnqueue(depth: number): void { depths.push(depth); }
    }
    const queue = ObservedQueue.createObserved({ 'handler': BusQueueRunners.recorder<number>([]) });
    BusQueueRunners.enqueueAll(queue, BusQueueRunners.numberItems(input.items));
    await queue.drain();
    assert.deepStrictEqual(depths, expected.depths);
  }

  static async 'on-error-continues'(scenarioCase: ScenarioCaseOfType<BusQueueScenarioCaseEntity.Type, 'on-error-continues'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const errors: unknown[] = [];
    const received: number[] = [];
    const throwOn = BusQueueRunners.requireDefined(input.throwOn, 'throwOn');
    const errorMessage = BusQueueRunners.requireDefined(input.errorMessage, 'errorMessage');
    const recordReceived = BusQueueRunners.recorder(received);
    const handler = (item: number): Promise<void> => {
      if (item === throwOn) {
        const failed = Promise.reject(RuntimeError.create(errorMessage));
        return failed;
      }
      const recorded = recordReceived(item);
      return recorded;
    };
    const onError = (error: unknown): void => { errors.push(error); };
    const queue = BusQueue.create<number>({ 'handler': handler, 'onError': onError });
    BusQueueRunners.enqueueAll(queue, BusQueueRunners.numberItems(input.items));
    await queue.drain();
    assert.deepStrictEqual(received, expected.received);
    assert.strictEqual(errors.length, expected.errorCount);
    assert.strictEqual(BusQueueRunners.requireError(errors[0]).message, expected.errorMessage);
  }

  static async 'overflow-hook-fires'(scenarioCase: ScenarioCaseOfType<BusQueueScenarioCaseEntity.Type, 'overflow-hook-fires'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const overflowDepths: number[] = [];
    const blockFirst = Promise.withResolvers<void>();
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
          await blockFirst.promise;
        }
      },
      'highWaterMark': BusQueueRunners.requireDefined(input.highWaterMark, 'highWaterMark')
    });
    BusQueueRunners.enqueueAll(queue, BusQueueRunners.numberItems(input.items));
    await BusQueueRunners.flushMicrotasks(BusQueueRunners.requireDefined(input.flushMicrotasks, 'flushMicrotasks'));
    blockFirst.resolve();
    await queue.drain();
    assert.strictEqual(overflowDepths.length >= BusQueueRunners.expectedNumber(expected.overflowDepthsAtLeast, 'overflowDepthsAtLeast'), true);
  }

  static async 'rejecting-enqueue-hook'(scenarioCase: ScenarioCaseOfType<BusQueueScenarioCaseEntity.Type, 'rejecting-enqueue-hook'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const processed: number[] = [];
    const errorMessage = BusQueueRunners.requireDefined(input.errorMessage, 'errorMessage');
    class ThrowingEnqueueQueue extends BusQueue<number> {
      static createThrowing(options: BusQueueCreateOptionsInterface<number>): ThrowingEnqueueQueue {
        return new ThrowingEnqueueQueue(options);
      }
      #attempt = 0;
      protected override onEnqueue(): Promise<void> {
        this.#attempt += 1;
        if (this.#attempt === 1) {
          const failed = Promise.reject(RuntimeError.create(errorMessage));
          return failed;
        }
        const done = Promise.resolve();
        return done;
      }
    }
    const queue = ThrowingEnqueueQueue.createThrowing({
      'handler': BusQueueRunners.recorder(processed)
    });
    await Promise.all(BusQueueRunners.numberItems(input.items).map((item) => {
      const pending = queue.enqueue(item);
      return pending;
    }));
    await queue.drain();
    assert.deepStrictEqual(processed, expected.processed);
  }

  static async 'rejecting-overflow-hook'(scenarioCase: ScenarioCaseOfType<BusQueueScenarioCaseEntity.Type, 'rejecting-overflow-hook'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const processed: number[] = [];
    const errorMessage = BusQueueRunners.requireDefined(input.errorMessage, 'errorMessage');
    class ThrowingOverflowQueue extends BusQueue<number> {
      static createThrowing(options: BusQueueCreateOptionsInterface<number>): ThrowingOverflowQueue {
        return new ThrowingOverflowQueue(options);
      }
      #attempt = 0;
      protected override onOverflow(): Promise<void> {
        this.#attempt += 1;
        if (this.#attempt === 1) {
          const failed = Promise.reject(RuntimeError.create(errorMessage));
          return failed;
        }
        const done = Promise.resolve();
        return done;
      }
    }
    const queue = ThrowingOverflowQueue.createThrowing({
      'handler': BusQueueRunners.recorder(processed),
      'highWaterMark': BusQueueRunners.requireDefined(input.highWaterMark, 'highWaterMark')
    });
    await Promise.all(BusQueueRunners.numberItems(input.items).map((item) => {
      const pending = queue.enqueue(item);
      return pending;
    }));
    await queue.drain();
    assert.deepStrictEqual(processed, expected.processed);
  }

  static async 'single-drain-loop'(scenarioCase: ScenarioCaseOfType<BusQueueScenarioCaseEntity.Type, 'single-drain-loop'>): Promise<void> {
    const { expected, input } = scenarioCase;
    let activeHandlers = 0;
    let peakConcurrentHandlers = 0;
    const processed: number[] = [];
    const firstBlocked = Promise.withResolvers<void>();
    const queue = BusQueue.create<number>({
      'handler': async (item) => {
        activeHandlers += 1;
        peakConcurrentHandlers = Math.max(peakConcurrentHandlers, activeHandlers);
        if (item === BusQueueRunners.itemAt(input.items, 0)) { await firstBlocked.promise; }
        processed.push(item);
        activeHandlers -= 1;
      }
    });
    const first = queue.enqueue(BusQueueRunners.itemAt(input.items, 0));
    const second = queue.enqueue(BusQueueRunners.itemAt(input.items, 1));
    firstBlocked.resolve();
    await Promise.all([first, second]);
    await queue.drain();
    assert.strictEqual(peakConcurrentHandlers, expected.maxConcurrentHandlers);
    assert.deepStrictEqual(processed, expected.processed);
  }

  static async 'size-before-drain'(scenarioCase: ScenarioCaseOfType<BusQueueScenarioCaseEntity.Type, 'size-before-drain'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const observedSizes: number[] = [];
    const sizeRecorder = (): Promise<void> => {
      observedSizes.push(queue.size);
      const done = Promise.resolve();
      return done;
    };
    const queue = BusQueue.create<number>({
      'handler': sizeRecorder
    });
    BusQueueRunners.enqueueAll(queue, BusQueueRunners.numberItems(input.items));
    await queue.drain();
    assert.deepStrictEqual(observedSizes, expected.observedSizes);
  }

  static async 'throwing-dequeue-hook'(scenarioCase: ScenarioCaseOfType<BusQueueScenarioCaseEntity.Type, 'throwing-dequeue-hook'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const errors: unknown[] = [];
    const processed: number[] = [];
    const errorMessage = BusQueueRunners.requireDefined(input.errorMessage, 'errorMessage');
    class ThrowingOnDequeueQueue extends BusQueue<number> {
      static createThrowing(options: BusQueueCreateOptionsInterface<number>): ThrowingOnDequeueQueue {
        return new ThrowingOnDequeueQueue(options);
      }
      #thrown = false;

      protected override onDequeue(_depth: number): void {
        if (this.#thrown === false) {
          this.#thrown = true;
          throw RuntimeError.create(errorMessage);
        }
      }
    }
    const queue = ThrowingOnDequeueQueue.createThrowing({
      'handler': BusQueueRunners.recorder(processed),
      'onError': (error) => { errors.push(error); }
    });
    void queue.enqueue(BusQueueRunners.itemAt(input.items, 0));
    await Promise.resolve();
    await queue.enqueue(BusQueueRunners.itemAt(input.items, 1));
    await queue.drain();
    assert.deepStrictEqual(processed, expected.processed);
    assert.strictEqual(queue.size, 0);
    assert.strictEqual(errors.length, expected.errors);
  }

  private static enqueueAll<TItem>(queue: BusQueue<TItem>, items: readonly TItem[]): void {
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (item !== undefined) {
        void queue.enqueue(item);
      }
    }
  }

  private static expectedArray(value: unknown, context: string): unknown[] {
    if (Array.isArray(value)) {
      return value;
    }
    throw RuntimeError.create(`Scenario expected.${context} must be an array`);
  }

  private static expectedNumber(value: unknown, context: string): number {
    if (typeof value === 'number') {
      return value;
    }
    throw RuntimeError.create(`Scenario expected.${context} must be a number`);
  }

  private static expectedStringArray(value: unknown, context: string): string[] {
    if (Array.isArray(value) && value.every((item) => { const isString = typeof item === 'string'; return isString; })) {
      return value;
    }
    throw RuntimeError.create(`Scenario expected.${context} must be a string array`);
  }

  private static async flushMicrotasks(times: number): Promise<void> {
    for (let i = 0; i < times; i += 1) {
      await Promise.resolve();
    }
  }

  private static itemAt(items: readonly (number | string)[] | undefined, index: number): number {
    const item = BusQueueRunners.requireNumber(items?.[index], `items[${String(index)}]`);
    return item;
  }

  private static numberItems(items: readonly (number | string)[] | undefined): number[] {
    const required = BusQueueRunners.requireDefined(items, 'items');
    const numbers = required.map((item, index) => {
      const value = BusQueueRunners.requireNumber(item, `items[${String(index)}]`);
      return value;
    });
    return numbers;
  }

  private static recorder<TItem>(target: TItem[]): (item: TItem) => Promise<void> {
    const record = (item: TItem): Promise<void> => {
      target.push(item);
      const done = Promise.resolve();
      return done;
    };
    return record;
  }

  private static valueRecorder<TValue>(target: TValue[], value: TValue): () => Promise<void> {
    const record = (): Promise<void> => {
      target.push(value);
      const done = Promise.resolve();
      return done;
    };
    return record;
  }

  private static requireDefined<TValue>(value: TValue | undefined, context: string): TValue {
    if (value === undefined) {
      throw RuntimeError.create(`Scenario ${context} is required`);
    }
    return value;
  }

  private static requireError(value: unknown): Error {
    if (value instanceof Error) {
      return value;
    }
    throw RuntimeError.create('Expected an Error instance');
  }

  private static requireNumber(value: number | string | undefined, context: string): number {
    if (typeof value === 'number') {
      return value;
    }
    throw RuntimeError.create(`Scenario ${context} must be a number`);
  }

  private static requireString(value: number | string | undefined, context: string): string {
    if (typeof value === 'string') {
      return value;
    }
    throw RuntimeError.create(`Scenario ${context} must be a string`);
  }

  private static async runDropObserved(scenarioCase: ScenarioCaseOfType<BusQueueScenarioCaseEntity.Type, 'abort-initially-cancelled' | 'on-drop-noop'>): Promise<void> {
    const { expected, input } = scenarioCase;
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
    controller.abort(RuntimeError.create('aborted before enqueue'));
    const queue = DropObservedQueue.createDropObserved({
      'handler': (item) => {
        const failed = Promise.reject(RuntimeError.create(`unexpected delivery: ${String(item)}`));
        return failed;
      },
      'signal': controller.signal
    });

    await queue.enqueue(BusQueueRunners.requireNumber(input.item, 'item'));
    await queue.drain();
    assert.strictEqual(dropped.length, expected.dropped);
    assert.strictEqual(queue.size, expected.size);
  }

  private static stringItems(items: readonly (number | string)[] | undefined): string[] {
    const required = BusQueueRunners.requireDefined(items, 'items');
    const strings = required.map((item, index) => {
      const value = BusQueueRunners.requireString(item, `items[${String(index)}]`);
      return value;
    });
    return strings;
  }
}

ScenarioSuite.register({
  'entity': BusQueueScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'BusQueue',
  'runners': BusQueueRunners
});
