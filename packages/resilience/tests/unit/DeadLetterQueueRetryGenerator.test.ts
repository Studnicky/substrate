import type { HookInvocationError } from '@studnicky/errors';

import { deepStrictEqual, strictEqual } from 'node:assert/strict';
import { it } from 'node:test';

import { DeadLetterQueue, DeadLetterQueueRetryGenerator } from '../../src/index.js';

class ObservedRetryGenerator<T> extends DeadLetterQueueRetryGenerator<T> {
  readonly events: string[] = [];

  static build<T>(dlq: DeadLetterQueue<T>, intervalMs: number): ObservedRetryGenerator<T> {
    return new ObservedRetryGenerator<T>({ 'dlq': dlq, 'intervalMs': intervalMs });
  }

  protected override onDone(): void {
    this.events.push('done');
  }

  protected override onWait(intervalMs: number): void {
    this.events.push(`wait:${intervalMs}`);
  }

  protected override onYield(): void {
    this.events.push('yield');
  }
}

class ThrowingYieldGenerator<T> extends DeadLetterQueueRetryGenerator<T> {
  static build<T>(dlq: DeadLetterQueue<T>, intervalMs: number): ThrowingYieldGenerator<T> {
    return new ThrowingYieldGenerator<T>({ 'dlq': dlq, 'intervalMs': intervalMs });
  }

  protected override onYield(): void {
    throw new Error('onYield boom');
  }
}

class ThrowingWaitGenerator<T> extends DeadLetterQueueRetryGenerator<T> {
  static build<T>(dlq: DeadLetterQueue<T>, intervalMs: number): ThrowingWaitGenerator<T> {
    return new ThrowingWaitGenerator<T>({ 'dlq': dlq, 'intervalMs': intervalMs });
  }

  protected override onWait(): void {
    throw new Error('onWait boom');
  }
}

class ThrowingDoneGenerator<T> extends DeadLetterQueueRetryGenerator<T> {
  static build<T>(dlq: DeadLetterQueue<T>, intervalMs: number): ThrowingDoneGenerator<T> {
    return new ThrowingDoneGenerator<T>({ 'dlq': dlq, 'intervalMs': intervalMs });
  }

  protected override onDone(): void {
    throw new Error('onDone boom');
  }
}

it('lifecycle hooks fire around yielded entries', async () => {
  const dlq = DeadLetterQueue.create<string>();
  dlq.enqueue('first', 'reason');
  dlq.close();

  const generator = ObservedRetryGenerator.build(dlq, 0);
  const yielded: string[] = [];
  for await (const entry of generator.generate()) {
    yielded.push(entry.item);
  }

  deepStrictEqual(yielded, ['first']);
  deepStrictEqual(generator.events, ['yield', 'wait:0', 'done']);
});

it('a throwing onYield hook does not replace generate()', async () => {
  const dlq = DeadLetterQueue.create<string>();
  dlq.enqueue('first', 'reason');
  dlq.close();

  const generator = ThrowingYieldGenerator.build(dlq, 0);
  const yielded: string[] = [];
  for await (const entry of generator.generate()) {
    yielded.push(entry.item);
  }

  deepStrictEqual(yielded, ['first']);
});

it('a throwing onWait hook does not replace the retry stream', async () => {
  const dlq = DeadLetterQueue.create<string>();
  dlq.enqueue('first', 'reason');
  dlq.close();

  const generator = ThrowingWaitGenerator.build(dlq, 0);
  const yielded: string[] = [];
  for await (const entry of generator.generate()) {
    yielded.push(entry.item);
  }

  deepStrictEqual(yielded, ['first']);
});

it('a throwing onDone hook does not replace generator completion', async () => {
  const dlq = DeadLetterQueue.create<string>();
  dlq.close();

  const generator = ThrowingDoneGenerator.build(dlq, 0);
  let count = 0;
  for await (const _entry of generator.generate()) {
    count += 1;
  }

  strictEqual(count, 0);
});

it('an async-overridden onYield hook that rejects is routed to hookErrors without producing an unhandled rejection', async () => {
  class AsyncRejectingYieldGenerator<T> extends DeadLetterQueueRetryGenerator<T> {
    get recordedHookErrors(): HookInvocationError[] { const result = this.hookErrors;
      return result; }

    static build<T>(dlq: DeadLetterQueue<T>, intervalMs: number): AsyncRejectingYieldGenerator<T> {
      return new AsyncRejectingYieldGenerator<T>({ 'dlq': dlq, 'intervalMs': intervalMs });
    }

    protected override async onYield(): Promise<void> {
      await Promise.resolve();
      throw new Error('async onYield boom');
    }
  }

  const rejectionEvents: unknown[] = [];
  const onUnhandledRejection = (reason: unknown): void => { rejectionEvents.push(reason); };
  process.on('unhandledRejection', onUnhandledRejection);

  try {
    const dlq = DeadLetterQueue.create<string>();
    dlq.enqueue('first', 'reason');
    dlq.close();

    const generator = AsyncRejectingYieldGenerator.build(dlq, 0);
    const yielded: string[] = [];
    for await (const entry of generator.generate()) {
      yielded.push(entry.item);
    }

    await new Promise((resolve) => { setImmediate(resolve); });

    deepStrictEqual(yielded, ['first']);
    strictEqual(rejectionEvents.length, 0);
    strictEqual(generator.recordedHookErrors.length, 1);
    strictEqual(generator.recordedHookErrors[0]?.hookName, 'onYield');
  } finally {
    process.off('unhandledRejection', onUnhandledRejection);
  }
});
