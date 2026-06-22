import type { LoggerInterface } from '../../src/interfaces/LoggerInterface.js';

import assert from 'node:assert/strict';
import {
  after,
  before,
  describe,
  it
} from 'node:test';

import { LogLevel } from '../../src/constants/LogLevel.js';
import { ConsoleLogger } from '../../src/index.js';

import { TestFactory } from './TestFactory.js';

void describe('ConsoleLogger wrapper functionality', () => {
  const originalConsole = {
    debug: console.debug,
    error: console.error,
    info: console.info,
    trace: console.trace,
    warn: console.warn
  };

  const logs: Array<{
    args: unknown[];
    level: string;
  }> = [];

  void before(() => {
    console.trace = (...args: unknown[]) => {
      logs.push({
        args,
        level: 'trace'
      });
    };
    console.debug = (...args: unknown[]) => {
      logs.push({
        args,
        level: 'debug'
      });
    };
    console.info = (...args: unknown[]) => {
      logs.push({
        args,
        level: 'info'
      });
    };
    console.warn = (...args: unknown[]) => {
      logs.push({
        args,
        level: 'warn'
      });
    };
    console.error = (...args: unknown[]) => {
      logs.push({
        args,
        level: 'error'
      });
    };
  });

  void after(() => {
    console.trace = originalConsole.trace;
    console.debug = originalConsole.debug;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });

  void describe('log methods with LogDataType', () => {
    void it('should pass log body with context correctly', () => {
      logs.length = 0;

      const logger = ConsoleLogger.create({ level: 'info' });
      const body = TestFactory.body('message', { key1: 'value1' });

      logger.info(body);

      assert.strictEqual(logs.length, 1);
      const logEntry = logs[0];

      assert.ok(logEntry);
      assert.strictEqual(logEntry.args.length, 2);
      assert.strictEqual(logEntry.args[0], 'message');
      assert.deepStrictEqual(logEntry.args[1], body);
    });

    void it('should handle error faults correctly', () => {
      logs.length = 0;

      const logger = ConsoleLogger.create({ level: 'error' });
      const error = new Error('test error');
      const fault = TestFactory.fault(error);

      logger.error(fault);

      assert.strictEqual(logs.length, 1);
      assert.strictEqual(logs[0]?.args[0], 'test error');
    });

    void it('should handle log body with empty context', () => {
      logs.length = 0;

      const logger = ConsoleLogger.create({ level: 'info' });

      logger.info(TestFactory.body('simple message'));

      assert.strictEqual(logs.length, 1);
    });
  });

  void describe('message formatting edge cases', () => {
    void it('should handle empty string messages', () => {
      logs.length = 0;

      const logger = ConsoleLogger.create({ level: 'trace' });

      logger.trace(TestFactory.body(''));
      logger.debug(TestFactory.body(''));
      logger.info(TestFactory.body(''));
      logger.warn(TestFactory.body(''));
      logger.error(TestFactory.body(''));

      assert.strictEqual(logs.length, 5);
      assert.strictEqual(logs[0]?.args[0], '');
      assert.strictEqual(logs[1]?.args[0], '');
      assert.strictEqual(logs[2]?.args[0], '');
      assert.strictEqual(logs[3]?.args[0], '');
      assert.strictEqual(logs[4]?.args[0], '');
    });

    void it('should handle very long messages', () => {
      logs.length = 0;

      const logger = ConsoleLogger.create({ level: 'info' });
      const longMessage = 'a'.repeat(10_000);

      logger.info(TestFactory.body(longMessage));

      assert.strictEqual(logs.length, 1);
      assert.strictEqual(logs[0]?.args[0], longMessage);
    });

    void it('should handle messages with newlines', () => {
      logs.length = 0;

      const logger = ConsoleLogger.create({ level: 'info' });
      const multiline = 'line1\nline2\nline3';

      logger.info(TestFactory.body(multiline));

      assert.strictEqual(logs.length, 1);
      assert.strictEqual(logs[0]?.args[0], multiline);
    });

    void it('should handle messages with special characters', () => {
      logs.length = 0;

      const logger = ConsoleLogger.create({ level: 'info' });

      logger.info(TestFactory.body('Special: !@#$%^&*()'));
      logger.info(TestFactory.body('Unicode: chinese-characters'));

      assert.strictEqual(logs.length, 2);
    });

    void it('should handle empty prefix correctly', () => {
      logs.length = 0;

      const logger = ConsoleLogger.create({
        level: 'info',
        prefix: ''
      });

      logger.info(TestFactory.body('test'));

      assert.strictEqual(logs[0]?.args[0], 'test');
    });

    void it('should handle prefix with special characters', () => {
      logs.length = 0;

      const logger = ConsoleLogger.create({
        level: 'info',
        prefix: '[!@#$]'
      });

      logger.info(TestFactory.body('test'));

      assert.strictEqual(logs[0]?.args[0], '[!@#$] test');
    });

    void it('should format with prefix and timestamp combined', () => {
      logs.length = 0;

      const logger = ConsoleLogger.create({
        includeTimestamp: true,
        level: 'info',
        prefix: '[App]'
      });

      logger.info(TestFactory.body('test'));

      const message = logs[0]?.args[0] as string;

      assert.match(message, /^\[\d{4}-\d{2}-\d{2}T.*\] \[App\] test$/u);
    });

    void it('should format with metadata only', () => {
      logs.length = 0;

      const logger = ConsoleLogger.create({
        level: 'info',
        metadata: { service: 'api' }
      });

      logger.info(TestFactory.body('test'));

      const message = logs[0]?.args[0] as string;

      assert.match(message, /"service":"api"/u);
      assert.match(message, /test$/u);
    });

    void it('should format with all options combined', () => {
      logs.length = 0;

      const logger = ConsoleLogger.create({
        includeTimestamp: true,
        level: 'info',
        metadata: { version: '1.0' },
        prefix: '[App]'
      });

      logger.info(TestFactory.body('test'));

      const message = logs[0]?.args[0] as string;

      assert.match(message, /^\[.*\] \[App\] .*version.*test$/u);
    });
  });

  void describe('metadata edge cases', () => {
    void it('should handle empty metadata object', () => {
      logs.length = 0;

      const logger = ConsoleLogger.create({
        level: 'info',
        metadata: {}
      });

      logger.info(TestFactory.body('test'));

      assert.strictEqual(logs[0]?.args[0], 'test');
    });

    void it('should handle metadata with null values', () => {
      logs.length = 0;

      const logger = ConsoleLogger.create({
        level: 'info',
        metadata: { nullVal: null }
      });

      logger.info(TestFactory.body('test'));

      const message = logs[0]?.args[0] as string;

      assert.match(message, /null/u);
    });

    void it('should handle metadata with undefined values', () => {
      logs.length = 0;

      const logger = ConsoleLogger.create({
        level: 'info',
        metadata: { undefinedVal: undefined }
      });

      logger.info(TestFactory.body('test'));

      assert.strictEqual(logs.length, 1);
    });

    void it('should handle metadata with numeric values', () => {
      logs.length = 0;

      const logger = ConsoleLogger.create({
        level: 'info',
        metadata: {
          float: 3.14,
          negative: -1,
          positive: 42,
          zero: 0
        }
      });

      logger.info(TestFactory.body('test'));

      const message = logs[0]?.args[0] as string;

      assert.match(message, /"zero":0/u);
      assert.match(message, /"negative":-1/u);
      assert.match(message, /"positive":42/u);
      assert.match(message, /"float":3.14/u);
    });

    void it('should handle metadata with boolean values', () => {
      logs.length = 0;

      const logger = ConsoleLogger.create({
        level: 'info',
        metadata: {
          isFalse: false,
          isTrue: true
        }
      });

      logger.info(TestFactory.body('test'));

      const message = logs[0]?.args[0] as string;

      assert.match(message, /"isTrue":true/u);
      assert.match(message, /"isFalse":false/u);
    });

    void it('should handle metadata with special key names', () => {
      logs.length = 0;

      const logger = ConsoleLogger.create({
        level: 'info',
        metadata: {
          'key-with-dash': 'value1',
          'key.with.dot': 'value2',
          key_with_underscore: 'value3'
        }
      });

      logger.info(TestFactory.body('test'));

      assert.strictEqual(logs.length, 1);
    });
  });

  void describe('child logger edge cases', () => {
    void it('should create child with empty metadata', () => {
      logs.length = 0;

      const logger = ConsoleLogger.create({ level: 'info' });
      const child = logger.child({});

      child.info(TestFactory.body('test'));

      assert.strictEqual(logs.length, 1);
    });

    void it('should handle deeply nested children', () => {
      logs.length = 0;

      const logger = ConsoleLogger.create({ level: 'info' });
      let child: LoggerInterface = logger;

      for (let i = 0; i < 10; i++) {
        child = child.child({ [`level${i}`]: `value${i}` });
      }

      child.info(TestFactory.body('deeply nested'));

      assert.strictEqual(logs.length, 1);
      const message = logs[0]?.args[0] as string;

      assert.match(message, /level0/u);
      assert.match(message, /level9/u);
    });

    void it('should create multiple independent children', () => {
      logs.length = 0;

      const logger = ConsoleLogger.create({ level: 'info' });
      const child1 = logger.child({ id: '1' });
      const child2 = logger.child({ id: '2' });
      const child3 = logger.child({ id: '3' });

      child1.info(TestFactory.body('from child1'));
      child2.info(TestFactory.body('from child2'));
      child3.info(TestFactory.body('from child3'));

      assert.strictEqual(logs.length, 3);

      const msg1 = logs[0]?.args[0] as string;
      const msg2 = logs[1]?.args[0] as string;
      const msg3 = logs[2]?.args[0] as string;

      assert.match(msg1, /"id":"1"/u);
      assert.match(msg2, /"id":"2"/u);
      assert.match(msg3, /"id":"3"/u);
    });

    void it('should not affect parent when child logs', () => {
      logs.length = 0;

      const parent = ConsoleLogger.create({
        level: 'info',
        metadata: { parent: 'value' }
      });
      const child = parent.child({ child: 'value' });

      parent.info(TestFactory.body('parent message'));
      child.info(TestFactory.body('child message'));

      const parentMsg = logs[0]?.args[0] as string;
      const childMsg = logs[1]?.args[0] as string;

      assert.match(parentMsg, /"parent":"value"/u);
      assert.doesNotMatch(parentMsg, /child/u);

      assert.match(childMsg, /"parent":"value"/u);
      assert.match(childMsg, /"child":"value"/u);
    });
  });

  void describe('factory methods', () => {
    void it('should create with no arguments', () => {
      const logger = ConsoleLogger.create();

      assert.ok(logger instanceof ConsoleLogger);
    });

    void it('should create with empty config', () => {
      const logger = ConsoleLogger.create({});

      assert.ok(logger instanceof ConsoleLogger);
    });

    void it('should create with partial config', () => {
      const logger1 = ConsoleLogger.create({ level: 'debug' });
      const logger2 = ConsoleLogger.create({ prefix: '[Test]' });
      const logger3 = ConsoleLogger.create({ includeTimestamp: true });

      assert.ok(logger1 instanceof ConsoleLogger);
      assert.ok(logger2 instanceof ConsoleLogger);
      assert.ok(logger3 instanceof ConsoleLogger);
    });
  });

  void describe('log level boundary testing', () => {
    void it('should respect TRACE level boundary', () => {
      logs.length = 0;

      const logger = ConsoleLogger.create({ level: LogLevel.TRACE });

      logger.trace(TestFactory.body('trace'));
      logger.debug(TestFactory.body('debug'));
      logger.info(TestFactory.body('info'));
      logger.warn(TestFactory.body('warn'));
      logger.error(TestFactory.body('error'));

      assert.strictEqual(logs.length, 5);
    });

    void it('should respect DEBUG level boundary', () => {
      logs.length = 0;

      const logger = ConsoleLogger.create({ level: LogLevel.DEBUG });

      logger.trace(TestFactory.body('trace'));
      logger.debug(TestFactory.body('debug'));
      logger.info(TestFactory.body('info'));
      logger.warn(TestFactory.body('warn'));
      logger.error(TestFactory.body('error'));

      assert.strictEqual(logs.length, 4);
      assert.strictEqual(logs[0]?.level, 'debug');
    });

    void it('should respect INFO level boundary', () => {
      logs.length = 0;

      const logger = ConsoleLogger.create({ level: LogLevel.INFO });

      logger.trace(TestFactory.body('trace'));
      logger.debug(TestFactory.body('debug'));
      logger.info(TestFactory.body('info'));
      logger.warn(TestFactory.body('warn'));
      logger.error(TestFactory.body('error'));

      assert.strictEqual(logs.length, 3);
      assert.strictEqual(logs[0]?.level, 'info');
    });

    void it('should respect WARN level boundary', () => {
      logs.length = 0;

      const logger = ConsoleLogger.create({ level: LogLevel.WARN });

      logger.trace(TestFactory.body('trace'));
      logger.debug(TestFactory.body('debug'));
      logger.info(TestFactory.body('info'));
      logger.warn(TestFactory.body('warn'));
      logger.error(TestFactory.body('error'));

      assert.strictEqual(logs.length, 2);
      assert.strictEqual(logs[0]?.level, 'warn');
    });

    void it('should respect ERROR level boundary', () => {
      logs.length = 0;

      const logger = ConsoleLogger.create({ level: LogLevel.ERROR });

      logger.trace(TestFactory.body('trace'));
      logger.debug(TestFactory.body('debug'));
      logger.info(TestFactory.body('info'));
      logger.warn(TestFactory.body('warn'));
      logger.error(TestFactory.body('error'));

      assert.strictEqual(logs.length, 1);
      assert.strictEqual(logs[0]?.level, 'error');
    });

    void it('should respect SILENT level boundary', () => {
      logs.length = 0;

      const logger = ConsoleLogger.create({ level: LogLevel.SILENT });

      logger.trace(TestFactory.body('trace'));
      logger.debug(TestFactory.body('debug'));
      logger.info(TestFactory.body('info'));
      logger.warn(TestFactory.body('warn'));
      logger.error(TestFactory.body('error'));

      assert.strictEqual(logs.length, 0);
    });
  });

  void describe('instance independence', () => {
    void it('should create independent instances', () => {
      const logger1 = ConsoleLogger.create({
        level: 'debug',
        prefix: '[L1]'
      });
      const logger2 = ConsoleLogger.create({
        level: 'error',
        prefix: '[L2]'
      });

      assert.ok(logger1 instanceof ConsoleLogger);
      assert.ok(logger2 instanceof ConsoleLogger);
      assert.notStrictEqual(logger1, logger2);
    });

    void it('should not share state between instances', () => {
      logs.length = 0;

      const logger1 = ConsoleLogger.create({
        level: 'info',
        metadata: { logger: '1' }
      });
      const logger2 = ConsoleLogger.create({
        level: 'info',
        metadata: { logger: '2' }
      });

      logger1.info(TestFactory.body('from 1'));
      logger2.info(TestFactory.body('from 2'));

      const msg1 = logs[0]?.args[0] as string;
      const msg2 = logs[1]?.args[0] as string;

      assert.match(msg1, /"logger":"1"/u);
      assert.match(msg2, /"logger":"2"/u);
    });
  });
});
