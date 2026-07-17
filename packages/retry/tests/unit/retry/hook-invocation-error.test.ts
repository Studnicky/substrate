import {
  rejects,
  strictEqual
} from 'node:assert/strict';
import { it } from 'node:test';

import type { RetryConfigInterface } from '../../../src/interfaces/index.js';
import type { RetryCallStateType } from '../../../src/types/RetryCallStateType.js';

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

    protected override enterCall(_to: RetryCallStateType, _from: RetryCallStateType): void {
      throw new Error('enterCall boom');
    }
  }

  const retry = new ThrowingEnterCallRetry({ 'maxRetries': 1 });
  const result = await retry.execute(async () => 'ok');

  strictEqual(result, 'ok');
});
