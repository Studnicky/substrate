import { FetchClient } from '@studnicky/fetch/node';
import { Retry } from '@studnicky/retry/node';
import { Signal } from '@studnicky/signal/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { RequestExecutor, RequestExecutorError } from '../../../src/index.js';

void describe('RequestExecutor construction failures', () => {
  void it('rejects a fetchClient that does not implement FetchClientInterface with a RequestExecutorError', () => {
    assert.throws(() => {
      const config = { 'fetchClient': FetchClient.create(), 'retry': Retry.create({}), 'signal': Signal.create() };
      Reflect.set(config, 'fetchClient', undefined);
      RequestExecutor.create(config);
    }, RequestExecutorError);
  });
});
