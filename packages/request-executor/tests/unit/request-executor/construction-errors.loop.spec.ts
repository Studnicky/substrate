import { Retry } from '@studnicky/retry/node';
import { Signal } from '@studnicky/signal/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { RequestExecutor, RequestExecutorError } from '../../../src/index.js';

void describe('RequestExecutor construction failures', () => {
  void it('rejects a fetchClient that does not implement FetchClientInterface with a RequestExecutorError', () => {
    assert.throws(() => {
      Reflect.apply(RequestExecutor.create, RequestExecutor, [{ 'fetchClient': {}, 'retry': Retry.create({}), 'signal': Signal.create() }]);
    }, (error: unknown) => {
      assert.ok(error instanceof RequestExecutorError);
      assert.equal(error.code, 'requestExecutor.invalidInput');
      assert.equal(error.message, 'fetchClient must implement FetchClientInterface');
      return true;
    });
  });
});
