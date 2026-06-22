/**
 * Mutex Creation Unit Tests
 *
 * Tests all methods for creating Mutex instances:
 * - Direct constructor
 * - Static create() method
 * - Builder pattern
 */

import {
  deepStrictEqual, ok, strictEqual, throws
} from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import {
  Mutex, MutexBuilder
} from '../../../src/mutex/index.js';
import { fullConfig } from '../../fixtures/constants.js';

void describe('Mutex Creation', () => {
  void describe('Constructor', () => {
    void it('creates with no config', () => {
      const mutex = new Mutex<string>();
      const config = mutex.getConfig();

      strictEqual(config.maxQueueSize, 0);
      strictEqual(config.timeout, 0);
    });

    void it('creates with partial config', () => {
      const mutex = new Mutex<string>({ maxQueueSize: 50 });
      const config = mutex.getConfig();

      strictEqual(config.maxQueueSize, 50);
      strictEqual(config.timeout, 0);
    });

    void it('creates with full config', () => {
      const mutex = new Mutex<string>(fullConfig);
      const config = mutex.getConfig();

      strictEqual(config.maxQueueSize, 100);
      strictEqual(config.timeout, 5000);
    });
  });

  void describe('Static create() Method', () => {
    void it('creates with no config', () => {
      const mutex = Mutex.create();
      const config = mutex.getConfig();

      strictEqual(config.maxQueueSize, 0);
      strictEqual(config.timeout, 0);
    });

    void it('creates with partial config', () => {
      const mutex = Mutex.create({ timeout: 3000 });
      const config = mutex.getConfig();

      strictEqual(config.maxQueueSize, 0);
      strictEqual(config.timeout, 3000);
    });

    void it('creates with full config', () => {
      const mutex = Mutex.create(fullConfig);
      const config = mutex.getConfig();

      strictEqual(config.maxQueueSize, 100);
      strictEqual(config.timeout, 5000);
    });

    void it('creates functional mutex', async () => {
      const mutex = Mutex.create<number>();
      const release = await mutex.acquire(42);

      ok(mutex.isLocked(42));

      release();
    });
  });

  void describe('Builder Pattern', () => {
    void it('creates with no configuration', () => {
      const mutex = new MutexBuilder<string>().build();
      const config = mutex.getConfig();

      strictEqual(config.maxQueueSize, 0);
      strictEqual(config.timeout, 0);
    });

    void it('creates with single property', () => {
      const mutex = new MutexBuilder<string>()
        .withMaxQueueSize(75)
        .build();
      const config = mutex.getConfig();

      strictEqual(config.maxQueueSize, 75);
      strictEqual(config.timeout, 0);
    });

    void it('creates with chained methods', () => {
      const mutex = new MutexBuilder<string>()
        .withMaxQueueSize(50)
        .withTimeout(1000)
        .build();
      const config = mutex.getConfig();

      strictEqual(config.maxQueueSize, 50);
      strictEqual(config.timeout, 1000);
    });

    void it('creates with all properties', () => {
      const mutex = new MutexBuilder<string>()
        .withMaxQueueSize(150)
        .withTimeout(7500)
        .withCoalescing(true)
        .build();
      const config = mutex.getConfig();

      strictEqual(config.maxQueueSize, 150);
      strictEqual(config.timeout, 7500);
      strictEqual(config.enableCoalescing, true);
    });

    void it('creates with initial config', () => {
      const mutex = new MutexBuilder<string>({
        maxQueueSize: 25,
        timeout: 1000
      }).build();
      const config = mutex.getConfig();

      strictEqual(config.maxQueueSize, 25);
      strictEqual(config.timeout, 1000);
    });

    void it('creates functional mutex', async () => {
      const mutex = new MutexBuilder<string>()
        .withMaxQueueSize(10)
        .withTimeout(5000)
        .build();

      const result = await mutex.runExclusive('key1', async () => {
        return 'success';
      });

      strictEqual(result, 'success');
    });

    void it('validates configuration on build', () => {
      throws(
        () => {
          return new MutexBuilder<string>().withMaxQueueSize(-1)
            .build();
        },
        (error: Error) => {
          return error.message.includes('maxQueueSize');
        }
      );
    });
  });

  void describe('Equivalence Between Creation Methods', () => {
    void it('produces equivalent mutexes from create() and builder', () => {
      const mutex1 = Mutex.create(fullConfig);

      const mutex2 = new MutexBuilder<string>()
        .withMaxQueueSize(100)
        .withTimeout(5000)
        .build();

      deepStrictEqual(mutex1.getConfig(), mutex2.getConfig());
    });
  });

  void describe('Type Safety', () => {
    void it('supports string keys', async () => {
      const mutex = Mutex.create();
      const result = await mutex.runExclusive('key1', () => {
        return 'value';
      });

      strictEqual(result, 'value');
    });

    void it('supports number keys', async () => {
      const mutex = Mutex.create<number>();
      const result = await mutex.runExclusive(42, () => {
        return 'answer';
      });

      strictEqual(result, 'answer');
    });

    void it('supports composite string keys', async () => {
      const mutex = Mutex.create();
      const key = JSON.stringify({
        entityType: 'User',
        id: '123'
      });

      const result = await mutex.runExclusive(key, () => {
        return 'data';
      });

      strictEqual(result, 'data');
    });
  });
});
