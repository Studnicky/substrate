import { RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Throttle } from '../../../src/throttle/throttle/index.js';

class AbortAdmissionHelpers {
  static async settleMicrotasks(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
  }

  static async settlePromptly<TResult>(pending: Promise<TResult>): Promise<TResult> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => { reject(RuntimeError.create('Operation did not settle promptly.')); }, 100);
    });
    try {
      const settled = await Promise.race([pending, timeout]);
      return settled;
    } finally {
      clearTimeout(timer);
    }
  }
}

class DeferredAbortThrottle extends Throttle {
  static override create(config?: unknown): DeferredAbortThrottle {
    return new DeferredAbortThrottle(config);
  }
  readonly abortStarted = Promise.withResolvers<void>();
  readonly continueAbort = Promise.withResolvers<void>();

  protected override async onAbortStart(): Promise<void> {
    this.abortStarted.resolve();
    await this.continueAbort.promise;
  }
}

class DeferredAcquireThrottle extends Throttle {
  static override create(config?: unknown): DeferredAcquireThrottle {
    return new DeferredAcquireThrottle(config);
  }
  readonly acquireStarted = Promise.withResolvers<void>();
  readonly continueAcquire = Promise.withResolvers<void>();

  protected override async onAcquire(): Promise<void> {
    this.acquireStarted.resolve();
    await this.continueAcquire.promise;
  }
}

class DeferredAcquireWaitThrottle extends Throttle {
  static override create(config?: unknown): DeferredAcquireWaitThrottle {
    return new DeferredAcquireWaitThrottle(config);
  }
  readonly acquireWaitStarted = Promise.withResolvers<void>();
  readonly continueAcquireWait = Promise.withResolvers<void>();

  protected override async onAcquireWait(): Promise<void> {
    this.acquireWaitStarted.resolve();
    await this.continueAcquireWait.promise;
  }
}

void describe('Throttle abort admission ownership', () => {
  void it('settles active and queued work before a suspended abort hook completes', async () => {
    const throttle = DeferredAbortThrottle.create({ 'concurrencyLimit': 1 });
    const activeRelease = Promise.withResolvers<void>();
    let queuedStarted = false;
    const active = throttle.execute(async () => {
      await activeRelease.promise;
      return 'active';
    });
    const queued = throttle.execute(() => {
      queuedStarted = true;
      const settled = Promise.resolve('queued');
      return settled;
    });

    await AbortAdmissionHelpers.settleMicrotasks();
    const abort = throttle.abort();
    await throttle.abortStarted.promise;

    assert.strictEqual(await AbortAdmissionHelpers.settlePromptly(active), undefined);
    assert.strictEqual(await AbortAdmissionHelpers.settlePromptly(queued), undefined);
    assert.strictEqual(queuedStarted, false);
    assert.deepStrictEqual(throttle.getStats(), {
      'activeCount': 0,
      'concurrencyLimit': 1,
      'isAborted': true,
      'isDraining': false,
      'queuedCount': 0,
      'totalExecuted': 0
    });

    throttle.continueAbort.resolve();
    assert.strictEqual((await abort).cancelled, 2);
    activeRelease.resolve();
    await AbortAdmissionHelpers.settleMicrotasks();
  });

  void it('settles an immediately granted operation while its acquire hook is suspended', async () => {
    const throttle = DeferredAcquireThrottle.create({ 'concurrencyLimit': 1 });
    let callbackStarted = false;
    const operation = throttle.execute(() => {
      callbackStarted = true;
      const settled = Promise.resolve('unexpected');
      return settled;
    });

    await throttle.acquireStarted.promise;
    const abort = throttle.abort();

    assert.strictEqual(await AbortAdmissionHelpers.settlePromptly(operation), undefined);
    assert.strictEqual(callbackStarted, false);
    assert.strictEqual((await abort).cancelled, 1);
    assert.deepStrictEqual(throttle.getStats(), {
      'activeCount': 0,
      'concurrencyLimit': 1,
      'isAborted': true,
      'isDraining': false,
      'queuedCount': 0,
      'totalExecuted': 0
    });

    throttle.continueAcquire.resolve();
    await AbortAdmissionHelpers.settleMicrotasks();
    assert.strictEqual(callbackStarted, false);
  });

  void it('settles queued work while its acquire-wait hook is suspended', async () => {
    const throttle = DeferredAcquireWaitThrottle.create({ 'concurrencyLimit': 1 });
    const activeRelease = Promise.withResolvers<void>();
    const activeStarted = Promise.withResolvers<void>();
    let queuedStarted = false;
    const active = throttle.execute(async () => {
      activeStarted.resolve();
      await activeRelease.promise;
      return 'active';
    });
    await activeStarted.promise;
    const queued = throttle.execute(() => {
      queuedStarted = true;
      const settled = Promise.resolve('queued');
      return settled;
    });

    await throttle.acquireWaitStarted.promise;
    const abort = throttle.abort();

    assert.strictEqual(await AbortAdmissionHelpers.settlePromptly(active), undefined);
    assert.strictEqual(await AbortAdmissionHelpers.settlePromptly(queued), undefined);
    assert.strictEqual(queuedStarted, false);
    assert.strictEqual((await abort).cancelled, 2);
    assert.deepStrictEqual(throttle.getStats(), {
      'activeCount': 0,
      'concurrencyLimit': 1,
      'isAborted': true,
      'isDraining': false,
      'queuedCount': 0,
      'totalExecuted': 0
    });

    throttle.continueAcquireWait.resolve();
    activeRelease.resolve();
    await AbortAdmissionHelpers.settleMicrotasks();
    assert.strictEqual(queuedStarted, false);
  });
});
