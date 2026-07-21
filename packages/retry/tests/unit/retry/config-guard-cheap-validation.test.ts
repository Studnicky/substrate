import {
  strictEqual
} from 'node:assert/strict';
import { it, mock } from 'node:test';

import { DefaultHttpErrorClassifier } from '@studnicky/errors';

import { RetryConfigGuard } from '../../../src/index.js';

it('rejects an invalid config (bad maxRetries type) without constructing a classifier', () => {
  const createSpy = mock.method(DefaultHttpErrorClassifier, 'create');

  try {
    const result = RetryConfigGuard.isRetryConfig({ 'maxRetries': 'not-a-number' });

    strictEqual(result, false);
    strictEqual(createSpy.mock.callCount(), 0);
  } finally {
    createSpy.mock.restore();
  }
});

it('rejects an invalid config (unknown key) without constructing a classifier', () => {
  const createSpy = mock.method(DefaultHttpErrorClassifier, 'create');

  try {
    const result = RetryConfigGuard.isRetryConfig({ 'notARealKey': true });

    strictEqual(result, false);
    strictEqual(createSpy.mock.callCount(), 0);
  } finally {
    createSpy.mock.restore();
  }
});

it('accepts a valid config without constructing a classifier', () => {
  const createSpy = mock.method(DefaultHttpErrorClassifier, 'create');

  try {
    const result = RetryConfigGuard.isRetryConfig({ 'maxRetries': 3 });

    strictEqual(result, true);
    strictEqual(createSpy.mock.callCount(), 0);
  } finally {
    createSpy.mock.restore();
  }
});
