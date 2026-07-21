import type { HookInvocationError } from '@studnicky/errors';

import { deepStrictEqual, ok, strictEqual, throws } from 'node:assert/strict';
import { it } from 'node:test';

import { DeadLetterQueue, DeadLetterQueueRetryGenerator } from '../../src/index.js';
import { ResilienceConfigError } from '../../src/errors/ResilienceConfigError.js';

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

it('rejects negative and fractional retry intervals', () => {
  const dlq = DeadLetterQueue.create<string>();
  for (const intervalMs of [-1, 0.5]) {
    throws(
      () => { DeadLetterQueueRetryGenerator.create({ dlq, intervalMs }); },
      ResilienceConfigError
    );
  }
});

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

it('async hook failures remain isolated to their owning retry generator instances', async () => {
  class AsyncRejectingYieldGenerator<T> extends DeadLetterQueueRetryGenerator<T> {
    readonly #cause: Error;

    get recordedHookErrors(): readonly HookInvocationError[] { const result = this.hooks.getHookErrors();
      return result; }

    static build<T>(dlq: DeadLetterQueue<T>, intervalMs: number, cause: Error): AsyncRejectingYieldGenerator<T> {
      return new AsyncRejectingYieldGenerator<T>(dlq, intervalMs, cause);
    }

    private constructor(dlq: DeadLetterQueue<T>, intervalMs: number, cause: Error) {
      super({ 'dlq': dlq, 'intervalMs': intervalMs });
      this.#cause = cause;
    }

    protected override async onYield(): Promise<void> {
      await Promise.resolve();
      throw this.#cause;
    }
  }

  const rejectionEvents: unknown[] = [];
  const onUnhandledRejection = (reason: unknown): void => { rejectionEvents.push(reason); };
  process.on('unhandledRejection', onUnhandledRejection);

  try {
    const firstQueue = DeadLetterQueue.create<string>();
    firstQueue.enqueue('first', 'reason');
    firstQueue.close();
    const secondQueue = DeadLetterQueue.create<string>();
    secondQueue.enqueue('second', 'reason');
    secondQueue.close();

    const firstCause = new Error('first async onYield boom');
    const secondCause = new Error('second async onYield boom');
    const first = AsyncRejectingYieldGenerator.build(firstQueue, 0, firstCause);
    const second = AsyncRejectingYieldGenerator.build(secondQueue, 0, secondCause);
    const firstYielded: string[] = [];
    const secondYielded: string[] = [];
    for await (const entry of first.generate()) {
      firstYielded.push(entry.item);
    }
    for await (const entry of second.generate()) {
      secondYielded.push(entry.item);
    }

    await new Promise((resolve) => { setImmediate(resolve); });

    deepStrictEqual(firstYielded, ['first']);
    deepStrictEqual(secondYielded, ['second']);
    strictEqual(rejectionEvents.length, 0);
    const firstErrors = first.recordedHookErrors;
    const secondErrors = second.recordedHookErrors;
    strictEqual(firstErrors.length, 1);
    strictEqual(firstErrors[0]?.hookName, 'onYield');
    ok(firstErrors[0]?.cause instanceof Error);
    strictEqual(firstErrors[0].cause.message, firstCause.message);
    strictEqual(secondErrors.length, 1);
    strictEqual(secondErrors[0]?.hookName, 'onYield');
    ok(secondErrors[0]?.cause instanceof Error);
    strictEqual(secondErrors[0].cause.message, secondCause.message);
  } finally {
    process.off('unhandledRejection', onUnhandledRejection);
  }
});
