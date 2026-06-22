/**
 * Mutex Utility Methods Unit Tests
 *
 * Tests utility methods for inspecting mutex state:
 * - isLocked()
 * - queueSize()
 * - size()
 * - clear()
 * - getConfig()
 */

import {
  ok, strictEqual
} from 'node:assert/strict';
import {
  describe, it
} from 'node:test';
import {
  setTimeout as delay
} from 'node:timers/promises';

import { Mutex } from '../../../src/mutex/index.js';
import { mediumQueueConfig } from '../../fixtures/constants.js';

void describe('Utility Methods', () => {
  void describe('isLocked()', () => {
    void it('returns false for unlocked key', () => {
      const mutex = Mutex.create();

      ok(!mutex.isLocked('key1'));
    });

    void it('returns true for locked key', async () => {
      const mutex = Mutex.create();

      const release = await mutex.acquire('key1');

      ok(mutex.isLocked('key1'));

      release();
    });

    void it('returns false after lock release', async () => {
      const mutex = Mutex.create();

      const release = await mutex.acquire('key1');

      release();

      await delay(10);

      ok(!mutex.isLocked('key1'));
    });

    void it('tracks multiple keys independently', async () => {
      const mutex = Mutex.create();

      const release1 = await mutex.acquire('key1');

      ok(mutex.isLocked('key1'));
      ok(!mutex.isLocked('key2'));

      const release2 = await mutex.acquire('key2');

      ok(mutex.isLocked('key1'));
      ok(mutex.isLocked('key2'));

      release1();
      release2();
    });
  });

  void describe('queueSize()', () => {
    void it('returns 0 for unlocked key', () => {
      const mutex = Mutex.create();

      strictEqual(mutex.queueSize('key1'), 0);
    });

    void it('returns 0 when lock held but queue empty', async () => {
      const mutex = Mutex.create();

      const release = await mutex.acquire('key1');

      strictEqual(mutex.queueSize('key1'), 0);

      release();
    });

    void it('tracks queued operations', async () => {
      const mutex = Mutex.create();

      const release = await mutex.acquire('key1');

      const promise1 = mutex.acquire('key1');

      strictEqual(mutex.queueSize('key1'), 1);

      const promise2 = mutex.acquire('key1');

      strictEqual(mutex.queueSize('key1'), 2);

      release();

      const release1 = await promise1;

      release1();

      const release2 = await promise2;

      release2();
    });

    void it('decrements as queue processes', async () => {
      const mutex = Mutex.create(mediumQueueConfig);

      const release1 = await mutex.acquire('key1');

      const promise1 = mutex.acquire('key1');
      const promise2 = mutex.acquire('key1');

      strictEqual(mutex.queueSize('key1'), 2);

      release1();

      const release2 = await promise1;

      strictEqual(mutex.queueSize('key1'), 1);

      release2();

      const release3 = await promise2;

      strictEqual(mutex.queueSize('key1'), 0);

      release3();
    });
  });

  void describe('size()', () => {
    void it('returns 0 initially', () => {
      const mutex = Mutex.create();

      strictEqual(mutex.size(), 0);
    });

    void it('returns number of active locks', async () => {
      const mutex = Mutex.create();

      const release1 = await mutex.acquire('key1');

      strictEqual(mutex.size(), 1);

      const release2 = await mutex.acquire('key2');

      strictEqual(mutex.size(), 2);

      release1();
      release2();

      await delay(10);

      strictEqual(mutex.size(), 0);
    });

    void it('does not count queued operations', async () => {
      const mutex = Mutex.create();

      const release1 = await mutex.acquire('key1');

      const promise1 = mutex.acquire('key1');

      strictEqual(mutex.size(), 1);

      release1();

      const release2 = await promise1;

      release2();
    });
  });

  void describe('clear()', () => {
    void it('clears all locks', async () => {
      const mutex = Mutex.create();

      await mutex.acquire('key1');
      await mutex.acquire('key2');

      strictEqual(mutex.size(), 2);

      mutex.clear();

      strictEqual(mutex.size(), 0);
      ok(!mutex.isLocked('key1'));
      ok(!mutex.isLocked('key2'));
    });

    void it('clears empty mutex', () => {
      const mutex = Mutex.create();

      mutex.clear();

      strictEqual(mutex.size(), 0);
    });
  });

  void describe('getConfig()', () => {
    void it('returns current configuration', () => {
      const mutex = Mutex.create({
        maxQueueSize: 100,
        timeout: 5000
      });

      const config = mutex.getConfig();

      strictEqual(config.maxQueueSize, 100);
      strictEqual(config.timeout, 5000);
    });

    void it('returns default config when none provided', () => {
      const mutex = Mutex.create();

      const config = mutex.getConfig();

      strictEqual(config.maxQueueSize, 0);
      strictEqual(config.timeout, 0);
    });
  });
});
