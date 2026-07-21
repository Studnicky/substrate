import {
  rejects,
  strictEqual
} from 'node:assert/strict';
import { it } from 'node:test';

import type { RetryConfigInterface } from '../../../src/interfaces/index.js';
import type { RetryCallStateEntity } from '../../../src/entities/RetryCallStateEntity.js';

import { HookInvocationError, HookInvoker } from '@studnicky/errors';
import { Retry } from '../../../src/retry/index.js';

it('HookInvoker default (no swallow override) throws HookInvocationError for a throwing hook', async () => {
  const invoker = new HookInvoker();

  await rejects(async () => invoker.invoke('someHook', () => { throw new Error('boom'); }), HookInvocationError);
});

it('Retry swallows a throwing enterCall hook via the consolidated hook-invocation mechanism', async () => {
  class ThrowingEnterCallRetry extends Retry {
    constructor(config?: Partial<RetryConfigInterface>) {
      super(config ?? {});
    }

    protected override enterCall(_to: RetryCallStateEntity.Type, _from: RetryCallStateEntity.Type): void {
      throw new Error('enterCall boom');
    }
  }

  const retry = new ThrowingEnterCallRetry({ 'maxRetries': 1 });
  const result = await retry.execute(async () => 'ok');

  strictEqual(result, 'ok');
});

it('Retry guards an async-rejecting enterCall hook without changing the successful result', async () => {
  const unhandledRejections: unknown[] = [];
  const onUnhandledRejection = (reason: unknown): void => { unhandledRejections.push(reason); };
  process.on('unhandledRejection', onUnhandledRejection);

  class RejectingEnterCallRetry extends Retry {
    constructor(config?: Partial<RetryConfigInterface>) {
      super(config ?? {});
    }

    protected override async enterCall(
      _to: RetryCallStateEntity.Type,
      _from: RetryCallStateEntity.Type
    ): Promise<void> {
      await Promise.resolve();
      throw new Error('enterCall async boom');
    }
  }

  try {
    const retry = new RejectingEnterCallRetry({ 'maxRetries': 1 });
    const result = await retry.execute(async () => 'ok');

    await new Promise((resolve) => { setImmediate(resolve); });
    await new Promise((resolve) => { setImmediate(resolve); });

    strictEqual(result, 'ok');
    strictEqual(unhandledRejections.length, 0);
  } finally {
    process.off('unhandledRejection', onUnhandledRejection);
  }
});
