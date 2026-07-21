/**
 * Proves RequestExecutor.create() builds FetchClient/Retry from plain config
 * and preserves pre-built instance identity.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { FetchClient } from '@studnicky/fetch';
import { Retry } from '@studnicky/retry';

import { RequestExecutor } from '../../../src/index.js';

void describe('RequestExecutor.create() with plain config', () => {
  void it('builds callable FetchClient and Retry dependencies from plain config', async () => {
    const executor = RequestExecutor.create({
      'fetchClient': { 'baseURL': 'http://127.0.0.1' },
      'retry': { 'maxRetries': 5 }
    });

    const result = await executor.execute(async (client, signal) => {
      assert.ok(client instanceof FetchClient);
      assert.equal(signal.aborted, false);
      return 'configured';
    });

    assert.equal(result, 'configured');
  });
});

void describe('RequestExecutor.create() with pre-built instances', () => {
  void it('executes through the caller-owned instances', async () => {
    const fetchClient = FetchClient.create({ 'baseURL': 'http://127.0.0.1' });
    const retry = Retry.create({ 'maxRetries': 2 });

    const executor = RequestExecutor.create({
      'deadlineMs': 1000,
      'fetchClient': fetchClient,
      'retry': retry
    });

    let attempts = 0;
    const result = await executor.execute(async (client) => {
      assert.strictEqual(client, fetchClient);
      attempts += 1;
      if (attempts === 1) {
        throw new Error('retry once');
      }
      return 'retried';
    });

    assert.equal(result, 'retried');
    assert.equal(retry.getStats().totalRetries, 1);
  });
});
