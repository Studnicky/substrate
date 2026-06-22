/**
 * Mutex Basic Functionality Tests
 *
 * Tests that Mutex works correctly without any observability injected.
 */

import { strictEqual } from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import {
  Mutex, MutexBuilder
} from '../../../src/mutex/index.js';

void describe('Mutex without observability', () => {
  void describe('Constructor', () => {
    void it('creates mutex without configuration', () => {
      const mutex = new Mutex<string>();

      strictEqual(typeof mutex, 'object', 'Mutex should be created');
    });

    void it('creates mutex with partial configuration', () => {
      const mutex = new Mutex<string>({ maxQueueSize: 50 });

      strictEqual(mutex.getConfig().maxQueueSize, 50);
    });
  });

  void describe('Static create() Method', () => {
    void it('creates mutex without arguments', () => {
      const mutex = Mutex.create();

      strictEqual(typeof mutex, 'object', 'Mutex should be created');
    });

    void it('acquires and releases lock', async () => {
      const mutex = Mutex.create<string>();

      const release = await mutex.acquire('testKey');

      strictEqual(mutex.isLocked('testKey'), true);

      release();

      strictEqual(mutex.isLocked('testKey'), false);
    });

    void it('runs exclusive operation', async () => {
      const mutex = Mutex.create<string>();
      let executed = false;

      await mutex.runExclusive('testKey', async () => {
        executed = true;
      });

      strictEqual(executed, true);
    });

    void it('serializes concurrent operations on the same key', async () => {
      const mutex = Mutex.create<string>();
      const order: number[] = [];

      const op1 = mutex.runExclusive('key', async () => {
        order.push(1);
        await new Promise<void>((resolve) => { setTimeout(resolve, 20); });
        order.push(2);
      });

      const op2 = mutex.runExclusive('key', async () => {
        order.push(3);
      });

      await Promise.all([op1, op2]);

      strictEqual(order[0], 1);
      strictEqual(order[1], 2);
      strictEqual(order[2], 3);
    });
  });

  void describe('Builder Pattern', () => {
    void it('creates mutex with builder defaults', () => {
      const mutex = new MutexBuilder<string>().build();

      strictEqual(typeof mutex, 'object', 'Mutex should be created');
    });

    void it('creates mutex with builder configuration', () => {
      const mutex = new MutexBuilder<string>()
        .withMaxQueueSize(10)
        .withTimeout(1000)
        .build();

      const config = mutex.getConfig();

      strictEqual(config.maxQueueSize, 10);
      strictEqual(config.timeout, 1000);
    });

    void it('acquires and releases lock via builder-created mutex', async () => {
      const mutex = new MutexBuilder<string>().build();

      const release = await mutex.acquire('key1');

      strictEqual(mutex.isLocked('key1'), true);

      release();

      strictEqual(mutex.isLocked('key1'), false);
    });
  });
});
