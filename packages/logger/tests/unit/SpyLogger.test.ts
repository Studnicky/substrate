import assert from 'node:assert/strict';
import {
  describe,
  it
} from 'node:test';

import { LOG_STATUS } from '../../src/builders/index.js';
import {
  NoOpLogger,
  SpyLogger
} from '../../src/index.js';

import { TestFactory } from './TestFactory.js';

void describe('SpyLogger', () => {
  void describe('wrap', () => {
    void it('creates a SpyLogger wrapping the provided logger', () => {
      const wrapped = NoOpLogger.create();
      const spy = SpyLogger.wrap(wrapped);

      assert.ok(spy instanceof SpyLogger);
    });

    void it('starts with empty entries', () => {
      const spy = SpyLogger.wrap(NoOpLogger.create());

      assert.deepStrictEqual(spy.entries, []);
    });
  });

  void describe('capture', () => {
    void it('captures trace logs', () => {
      const spy = SpyLogger.wrap(NoOpLogger.create());

      spy.trace(TestFactory.body('trace message'));

      assert.strictEqual(spy.entries.length, 1);
      const entry = spy.entries[0];

      assert.ok(entry);
      assert.strictEqual(entry.level, 'trace');
      assert.strictEqual(entry.message, 'trace message');
    });

    void it('captures debug logs', () => {
      const spy = SpyLogger.wrap(NoOpLogger.create());

      spy.debug(TestFactory.body('debug message'));

      assert.strictEqual(spy.entries.length, 1);
      const entry = spy.entries[0];

      assert.ok(entry);
      assert.strictEqual(entry.level, 'debug');
      assert.strictEqual(entry.message, 'debug message');
    });

    void it('captures info logs', () => {
      const spy = SpyLogger.wrap(NoOpLogger.create());

      spy.info(TestFactory.body('info message'));

      assert.strictEqual(spy.entries.length, 1);
      const entry = spy.entries[0];

      assert.ok(entry);
      assert.strictEqual(entry.level, 'info');
      assert.strictEqual(entry.message, 'info message');
    });

    void it('captures warn logs', () => {
      const spy = SpyLogger.wrap(NoOpLogger.create());

      spy.warn(TestFactory.body('warn message'));

      assert.strictEqual(spy.entries.length, 1);
      const entry = spy.entries[0];

      assert.ok(entry);
      assert.strictEqual(entry.level, 'warn');
      assert.strictEqual(entry.message, 'warn message');
    });

    void it('captures error logs', () => {
      const spy = SpyLogger.wrap(NoOpLogger.create());

      spy.error(TestFactory.body('error message'));

      assert.strictEqual(spy.entries.length, 1);
      const entry = spy.entries[0];

      assert.ok(entry);
      assert.strictEqual(entry.level, 'error');
      assert.strictEqual(entry.message, 'error message');
    });

    void it('captures multiple logs in order', () => {
      const spy = SpyLogger.wrap(NoOpLogger.create());

      spy.info(TestFactory.body('first'));
      spy.warn(TestFactory.body('second'));
      spy.error(TestFactory.body('third'));

      assert.strictEqual(spy.entries.length, 3);
      const [
        first,
        second,
        third
      ] = spy.entries;

      assert.ok(first && second && third);
      assert.strictEqual(first.message, 'first');
      assert.strictEqual(second.message, 'second');
      assert.strictEqual(third.message, 'third');
    });

    void it('includes timestamp in ISO format', () => {
      const spy = SpyLogger.wrap(NoOpLogger.create());
      const before = new Date().toISOString();

      spy.info(TestFactory.body('test'));

      const after = new Date().toISOString();
      const entry = spy.entries[0];

      assert.ok(entry);
      assert.ok(entry.timestamp >= before);
      assert.ok(entry.timestamp <= after);
    });
  });

  void describe('data capture', () => {
    void it('captures full log body data', () => {
      const spy = SpyLogger.wrap(NoOpLogger.create());
      const body = TestFactory.body('request', {
        requestId: '123',
        userId: 'abc'
      });

      spy.info(body);

      const entry = spy.entries[0];

      assert.ok(entry);
      assert.ok(entry.data);
      const context = entry.data.context as Record<string, unknown>;

      assert.strictEqual(context.requestId, '123');
      assert.strictEqual(context.userId, 'abc');
      assert.strictEqual(entry.data.status, LOG_STATUS.SUCCESS);
      assert.strictEqual(entry.data.event, 'TestFactory.body');
    });

    void it('captures log fault data with error info', () => {
      const spy = SpyLogger.wrap(NoOpLogger.create());
      const error = new Error('test error');
      const fault = TestFactory.fault(error);

      spy.error(fault);

      const entry = spy.entries[0];

      assert.ok(entry);
      assert.strictEqual(entry.message, 'test error');
      assert.ok(entry.data);
      assert.strictEqual(entry.data.status, LOG_STATUS.FAILED);
    });

    void it('captures context from log body', () => {
      const spy = SpyLogger.wrap(NoOpLogger.create());
      const body = TestFactory.body('simple message', {});

      spy.info(body);

      const entry = spy.entries[0];

      assert.ok(entry);
      assert.ok(entry.data);
      assert.strictEqual(entry.data.message, 'simple message');
    });
  });

  void describe('flush', () => {
    void it('returns captured logs', () => {
      const spy = SpyLogger.wrap(NoOpLogger.create());

      spy.info(TestFactory.body('message'));

      const logs = spy.flush();

      assert.strictEqual(logs.length, 1);
      const entry = logs[0];

      assert.ok(entry);
      assert.strictEqual(entry.message, 'message');
    });

    void it('clears the buffer after flush', () => {
      const spy = SpyLogger.wrap(NoOpLogger.create());

      spy.info(TestFactory.body('message'));
      spy.flush();

      assert.deepStrictEqual(spy.entries, []);
    });

    void it('returns empty array when no logs captured', () => {
      const spy = SpyLogger.wrap(NoOpLogger.create());

      const logs = spy.flush();

      assert.deepStrictEqual(logs, []);
    });
  });

  void describe('clear', () => {
    void it('clears captured logs', () => {
      const spy = SpyLogger.wrap(NoOpLogger.create());

      spy.info(TestFactory.body('message'));
      spy.clear();

      assert.deepStrictEqual(spy.entries, []);
    });

    void it('allows new logs after clear', () => {
      const spy = SpyLogger.wrap(NoOpLogger.create());

      spy.info(TestFactory.body('first'));
      spy.clear();
      spy.info(TestFactory.body('second'));

      assert.strictEqual(spy.entries.length, 1);
      const entry = spy.entries[0];

      assert.ok(entry);
      assert.strictEqual(entry.message, 'second');
    });
  });

  void describe('child loggers', () => {
    void it('returns a Logger from child()', () => {
      const spy = SpyLogger.wrap(NoOpLogger.create());
      const child = spy.child({ service: 'test' });

      assert.ok(typeof child.info === 'function');
      assert.ok(typeof child.child === 'function');
    });

    void it('child logs are captured in parent buffer', () => {
      const spy = SpyLogger.wrap(NoOpLogger.create());
      const child = spy.child({ service: 'auth' });

      child.info(TestFactory.body('child message'));

      assert.strictEqual(spy.entries.length, 1);
      const entry = spy.entries[0];

      assert.ok(entry);
      assert.strictEqual(entry.message, 'child message');
    });

    void it('child logs include child metadata', () => {
      const spy = SpyLogger.wrap(NoOpLogger.create());
      const child = spy.child({ service: 'auth' });

      child.info(TestFactory.body('login'));

      const entry = spy.entries[0];

      assert.ok(entry);
      assert.ok(entry.data);
      assert.strictEqual(entry.data.service, 'auth');
    });

    void it('grandchild logs merge metadata', () => {
      const spy = SpyLogger.wrap(NoOpLogger.create());
      const child = spy.child({ service: 'auth' });
      const grandchild = child.child({ operation: 'login' });

      grandchild.info(TestFactory.body('attempt'));

      const entry = spy.entries[0];

      assert.ok(entry);
      assert.ok(entry.data);
      assert.strictEqual(entry.data.service, 'auth');
      assert.strictEqual(entry.data.operation, 'login');
    });

    void it('child metadata merges with log body data', () => {
      const spy = SpyLogger.wrap(NoOpLogger.create());
      const child = spy.child({ service: 'auth' });

      child.info(TestFactory.body('login', { userId: '123' }));

      const entry = spy.entries[0];

      assert.ok(entry);
      assert.ok(entry.data);
      assert.strictEqual(entry.data.service, 'auth');
      const context = entry.data.context as Record<string, unknown>;

      assert.strictEqual(context.userId, '123');
    });

    void it('flush clears logs from all children', () => {
      const spy = SpyLogger.wrap(NoOpLogger.create());
      const child = spy.child({ service: 'auth' });

      child.info(TestFactory.body('before'));
      spy.flush();
      child.info(TestFactory.body('after'));

      assert.strictEqual(spy.entries.length, 1);
      const entry = spy.entries[0];

      assert.ok(entry);
      assert.strictEqual(entry.message, 'after');
    });

    void it('clear affects all children', () => {
      const spy = SpyLogger.wrap(NoOpLogger.create());
      const child = spy.child({ service: 'auth' });

      child.info(TestFactory.body('message'));
      spy.clear();

      assert.deepStrictEqual(spy.entries, []);
    });
  });

  void describe('passthrough to wrapped logger', () => {
    void it('calls wrapped logger methods', () => {
      const calls: Array<{ level: string }> = [];

      const mockLogger = {
        child: () => {
          return mockLogger;
        },
        debug: () => {
          return calls.push({ level: 'debug' });
        },
        error: () => {
          return calls.push({ level: 'error' });
        },
        info: () => {
          return calls.push({ level: 'info' });
        },
        trace: () => {
          return calls.push({ level: 'trace' });
        },
        warn: () => {
          return calls.push({ level: 'warn' });
        }
      };

      const spy = SpyLogger.wrap(mockLogger);

      spy.trace(TestFactory.body('t'));
      spy.debug(TestFactory.body('d'));
      spy.info(TestFactory.body('i'));
      spy.warn(TestFactory.body('w'));
      spy.error(TestFactory.body('e'));

      assert.strictEqual(calls.length, 5);
      assert.strictEqual(calls[0]?.level, 'trace');
      assert.strictEqual(calls[1]?.level, 'debug');
      assert.strictEqual(calls[2]?.level, 'info');
      assert.strictEqual(calls[3]?.level, 'warn');
      assert.strictEqual(calls[4]?.level, 'error');
    });
  });

  void describe('entries readonly', () => {
    void it('returns frozen snapshot with same content on multiple accesses', () => {
      const spy = SpyLogger.wrap(NoOpLogger.create());

      spy.info(TestFactory.body('test'));

      const first = spy.entries;
      const second = spy.entries;

      assert.ok(Object.isFrozen(first), 'entries should return frozen array');
      assert.ok(Object.isFrozen(second), 'entries should return frozen array');
      assert.deepStrictEqual(first, second, 'entries should have same content');
    });
  });
});
