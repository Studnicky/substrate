import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Throttle } from '../../../src/throttle/index.js';

async function settlePromptly<T>(pending: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => { reject(new Error('Operation did not settle promptly.')); }, 100);
  });
  try {
    return await Promise.race([pending, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function settleMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

class DeferredAbortThrottle extends Throttle {
  readonly abortStarted = Promise.withResolvers<void>();
  readonly continueAbort = Promise.withResolvers<void>();

  protected override async onAbortStart(): Promise<void> {
    this.abortStarted.resolve();
    await this.continueAbort.promise;
  }
}

class DeferredAcquireThrottle extends Throttle {
  readonly acquireStarted = Promise.withResolvers<void>();
  readonly continueAcquire = Promise.withResolvers<void>();

  protected override async onAcquire(): Promise<void> {
    this.acquireStarted.resolve();
    await this.continueAcquire.promise;
  }
}

class DeferredAcquireWaitThrottle extends Throttle {
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
    const queued = throttle.execute(async () => {
      queuedStarted = true;
      return 'queued';
    });

    await settleMicrotasks();
    const abort = throttle.abort();
    await throttle.abortStarted.promise;

    assert.strictEqual(await settlePromptly(active), undefined);
    assert.strictEqual(await settlePromptly(queued), undefined);
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
    await settleMicrotasks();
  });

  void it('settles an immediately granted operation while its acquire hook is suspended', async () => {
    const throttle = DeferredAcquireThrottle.create({ 'concurrencyLimit': 1 });
    let callbackStarted = false;
    const operation = throttle.execute(async () => {
      callbackStarted = true;
      return 'unexpected';
    });

    await throttle.acquireStarted.promise;
    const abort = throttle.abort();

    assert.strictEqual(await settlePromptly(operation), undefined);
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
    await settleMicrotasks();
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
    const queued = throttle.execute(async () => {
      queuedStarted = true;
      return 'queued';
    });

    await throttle.acquireWaitStarted.promise;
    const abort = throttle.abort();

    assert.strictEqual(await settlePromptly(active), undefined);
    assert.strictEqual(await settlePromptly(queued), undefined);
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
    await settleMicrotasks();
    assert.strictEqual(queuedStarted, false);
  });
});
