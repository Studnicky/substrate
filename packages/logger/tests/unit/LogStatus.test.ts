import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import {
  LOG_STATUS,
  STATUS_CATEGORIES
} from '../../src/constants/LOG_STATUS.js';
import {
  isFailureStatus,
  isLifecycleStatus,
  isSuccessStatus
} from '../../src/types/LogStatusType.js';

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

  void describe('isSuccessStatus()', () => {
    void it('should return true for success statuses', () => {
      assert.strictEqual(isSuccessStatus('success'), true);
      assert.strictEqual(isSuccessStatus('partial'), true);
      assert.strictEqual(isSuccessStatus('cached'), true);
      assert.strictEqual(isSuccessStatus('skipped'), true);
    });

    void it('should return false for non-success statuses', () => {
      assert.strictEqual(isSuccessStatus('failed'), false);
      assert.strictEqual(isSuccessStatus('pending'), false);
      assert.strictEqual(isSuccessStatus('retrying'), false);
    });
  });

  void describe('isFailureStatus()', () => {
    void it('should return true for failure statuses', () => {
      assert.strictEqual(isFailureStatus('failed'), true);
      assert.strictEqual(isFailureStatus('timeout'), true);
      assert.strictEqual(isFailureStatus('invalid'), true);
      assert.strictEqual(isFailureStatus('not_found'), true);
      assert.strictEqual(isFailureStatus('unauthorized'), true);
      assert.strictEqual(isFailureStatus('rate_limited'), true);
      assert.strictEqual(isFailureStatus('unavailable'), true);
    });

    void it('should return false for non-failure statuses', () => {
      assert.strictEqual(isFailureStatus('success'), false);
      assert.strictEqual(isFailureStatus('pending'), false);
      assert.strictEqual(isFailureStatus('retrying'), false);
    });
  });

  void describe('isLifecycleStatus()', () => {
    void it('should return true for lifecycle statuses', () => {
      assert.strictEqual(isLifecycleStatus('pending'), true);
      assert.strictEqual(isLifecycleStatus('in_progress'), true);
      assert.strictEqual(isLifecycleStatus('complete'), true);
    });

    void it('should return false for non-lifecycle statuses', () => {
      assert.strictEqual(isLifecycleStatus('success'), false);
      assert.strictEqual(isLifecycleStatus('failed'), false);
      assert.strictEqual(isLifecycleStatus('retrying'), false);
    });
  });
});
