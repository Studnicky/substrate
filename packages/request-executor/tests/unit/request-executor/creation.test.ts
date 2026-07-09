/**
 * Proves RequestExecutor.create() builds FetchClient/Retry from plain config
 * (not only from pre-built instances), and that RequestExecutorBuilder wires
 * an executor identically to create() while preserving instance identity.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { FetchClient } from '@studnicky/fetch';
import { Retry } from '@studnicky/retry';

import { RequestExecutor } from '../../../src/index.js';

void describe('RequestExecutor.create() with plain config', () => {
  void it('builds FetchClient and Retry from plain config instead of a pre-built instance', () => {
    const executor = RequestExecutor.create({
      'fetchClient': { 'baseURL': 'http://127.0.0.1' },
      'retry': { 'maxRetries': 5 }
    });

    assert.ok(executor.getFetchClient() instanceof FetchClient);
    assert.ok(executor.getRetry() instanceof Retry);
  });
});

void describe('RequestExecutor.builder()', () => {
  void it('wires a RequestExecutor identically to create(), preserving instance identity', () => {
    const fetchClient = FetchClient.create({ 'baseURL': 'http://127.0.0.1' });
    const retry = Retry.create({ 'maxRetries': 2 });

    const executor = RequestExecutor.builder()
      .fetchClient(fetchClient)
      .retry(retry)
      .deadlineMs(1000)
      .build();

    assert.strictEqual(executor.getFetchClient(), fetchClient);
    assert.strictEqual(executor.getRetry(), retry);
  });
});
