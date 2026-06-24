import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import {
  LOG_STATUS,
  STATUS_CATEGORIES
} from '../../src/constants/LOG_STATUS.js';
import { LogStatus } from '../../src/modules/LogStatus.js';

void describe('LogStatus', () => {
  void describe('LOG_STATUS constants', () => {
    void it('should have lifecycle status values', () => {
      assert.strictEqual(LOG_STATUS.PENDING, 'pending');
      assert.strictEqual(LOG_STATUS.IN_PROGRESS, 'in_progress');
      assert.strictEqual(LOG_STATUS.COMPLETE, 'complete');
    });

    void it('should have success status values', () => {
      assert.strictEqual(LOG_STATUS.SUCCESS, 'success');
      assert.strictEqual(LOG_STATUS.PARTIAL, 'partial');
      assert.strictEqual(LOG_STATUS.CACHED, 'cached');
      assert.strictEqual(LOG_STATUS.SKIPPED, 'skipped');
    });

    void it('should have failure status values', () => {
      assert.strictEqual(LOG_STATUS.FAILED, 'failed');
      assert.strictEqual(LOG_STATUS.TIMEOUT, 'timeout');
      assert.strictEqual(LOG_STATUS.INVALID, 'invalid');
      assert.strictEqual(LOG_STATUS.NOT_FOUND, 'not_found');
      assert.strictEqual(LOG_STATUS.UNAUTHORIZED, 'unauthorized');
      assert.strictEqual(LOG_STATUS.RATE_LIMITED, 'rate_limited');
      assert.strictEqual(LOG_STATUS.UNAVAILABLE, 'unavailable');
    });

    void it('should have retry status values', () => {
      assert.strictEqual(LOG_STATUS.RETRYING, 'retrying');
      assert.strictEqual(LOG_STATUS.RETRY_EXHAUSTED, 'retry_exhausted');
    });
  });

  void describe('STATUS_CATEGORIES', () => {
    void it('should have lifecycle category', () => {
      assert.deepStrictEqual(
        STATUS_CATEGORIES.LIFECYCLE,
        [
          'pending',
          'in_progress',
          'complete'
        ]
      );
    });

    void it('should have success category', () => {
      assert.deepStrictEqual(
        STATUS_CATEGORIES.SUCCESS,
        [
          'success',
          'partial',
          'cached',
          'skipped'
        ]
      );
    });

    void it('should have failure category', () => {
      assert.deepStrictEqual(
        STATUS_CATEGORIES.FAILURE,
        [
          'failed',
          'timeout',
          'invalid',
          'not_found',
          'unauthorized',
          'rate_limited',
          'unavailable'
        ]
      );
    });

    void it('should have retry category', () => {
      assert.deepStrictEqual(
        STATUS_CATEGORIES.RETRY,
        [
          'retrying',
          'retry_exhausted'
        ]
      );
    });
  });

  void describe('LogStatus.isSuccess()', () => {
    void it('should return true for success statuses', () => {
      assert.strictEqual(LogStatus.isSuccess('success'), true);
      assert.strictEqual(LogStatus.isSuccess('partial'), true);
      assert.strictEqual(LogStatus.isSuccess('cached'), true);
      assert.strictEqual(LogStatus.isSuccess('skipped'), true);
    });

    void it('should return false for non-success statuses', () => {
      assert.strictEqual(LogStatus.isSuccess('failed'), false);
      assert.strictEqual(LogStatus.isSuccess('pending'), false);
      assert.strictEqual(LogStatus.isSuccess('retrying'), false);
    });
  });

  void describe('LogStatus.isFailure()', () => {
    void it('should return true for failure statuses', () => {
      assert.strictEqual(LogStatus.isFailure('failed'), true);
      assert.strictEqual(LogStatus.isFailure('timeout'), true);
      assert.strictEqual(LogStatus.isFailure('invalid'), true);
      assert.strictEqual(LogStatus.isFailure('not_found'), true);
      assert.strictEqual(LogStatus.isFailure('unauthorized'), true);
      assert.strictEqual(LogStatus.isFailure('rate_limited'), true);
      assert.strictEqual(LogStatus.isFailure('unavailable'), true);
    });

    void it('should return false for non-failure statuses', () => {
      assert.strictEqual(LogStatus.isFailure('success'), false);
      assert.strictEqual(LogStatus.isFailure('pending'), false);
      assert.strictEqual(LogStatus.isFailure('retrying'), false);
    });
  });

  void describe('LogStatus.isLifecycle()', () => {
    void it('should return true for lifecycle statuses', () => {
      assert.strictEqual(LogStatus.isLifecycle('pending'), true);
      assert.strictEqual(LogStatus.isLifecycle('in_progress'), true);
      assert.strictEqual(LogStatus.isLifecycle('complete'), true);
    });

    void it('should return false for non-lifecycle statuses', () => {
      assert.strictEqual(LogStatus.isLifecycle('success'), false);
      assert.strictEqual(LogStatus.isLifecycle('failed'), false);
      assert.strictEqual(LogStatus.isLifecycle('retrying'), false);
    });
  });
});
