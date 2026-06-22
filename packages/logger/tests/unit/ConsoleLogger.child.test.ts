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

void describe('ConsoleLogger.child()', () => {
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

  before(() => {
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

  after(() => {
    console.trace = originalConsole.trace;
    console.debug = originalConsole.debug;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });

  void describe('child logger creation', () => {
    void it('should create child logger with metadata', () => {
      const logger = ConsoleLogger.create();
      const child = logger.child({ requestId: '123' });

      assert.ok(child instanceof ConsoleLogger);
    });

    void it('should return Logger interface', () => {
      const logger = ConsoleLogger.create();
      const child = logger.child({ requestId: '123' });

      assert.ok(typeof child.trace === 'function');
      assert.ok(typeof child.debug === 'function');
      assert.ok(typeof child.info === 'function');
      assert.ok(typeof child.warn === 'function');
      assert.ok(typeof child.error === 'function');
      assert.ok(typeof child.child === 'function');
    });
  });

  void describe('metadata inheritance', () => {
    void it('should include child metadata in log messages', () => {
      logs.length = 0;

      const logger = ConsoleLogger.create({ level: 'info' });
      const child = logger.child({ requestId: '123' });

      child.info(TestFactory.body('test message'));

      const message = logs[0]?.args[0] as string;

      assert.match(message, /requestId/u);
      assert.match(message, /123/u);
    });

    void it('should merge parent and child metadata', () => {
      logs.length = 0;

      const logger = ConsoleLogger.create({
        level: 'info',
        metadata: { service: 'api' }
      });
      const child = logger.child({ requestId: '123' });

      child.info(TestFactory.body('test message'));

      const message = logs[0]?.args[0] as string;

      assert.match(message, /service/u);
      assert.match(message, /api/u);
      assert.match(message, /requestId/u);
      assert.match(message, /123/u);
    });

    void it('should support nested child loggers', () => {
      logs.length = 0;

      const logger = ConsoleLogger.create({
        level: 'info',
        metadata: { service: 'api' }
      });
      const child1 = logger.child({ requestId: '123' });
      const child2 = child1.child({ userId: 'abc' });

      child2.info(TestFactory.body('test message'));

      const message = logs[0]?.args[0] as string;

      assert.match(message, /service/u);
      assert.match(message, /api/u);
      assert.match(message, /requestId/u);
      assert.match(message, /123/u);
      assert.match(message, /userId/u);
      assert.match(message, /abc/u);
    });

    void it('should override parent metadata with same key', () => {
      logs.length = 0;

      const logger = ConsoleLogger.create({
        level: 'info',
        metadata: { env: 'dev' }
      });
      const child = logger.child({ env: 'prod' });

      child.info(TestFactory.body('test message'));

      const message = logs[0]?.args[0] as string;

      assert.match(message, /prod/u);
      assert.doesNotMatch(message, /dev/u);
    });
  });

  void describe('configuration inheritance', () => {
    void it('should inherit log level from parent', () => {
      logs.length = 0;

      const logger = ConsoleLogger.create({ level: LogLevel.WARN });
      const child = logger.child({ requestId: '123' });

      child.info(TestFactory.body('info message'));
      child.warn(TestFactory.body('warn message'));

      assert.strictEqual(logs.length, 1);
      assert.strictEqual(logs[0]?.level, 'warn');
    });

    void it('should inherit prefix from parent', () => {
      logs.length = 0;

      const logger = ConsoleLogger.create({
        level: 'info',
        prefix: '[App]'
      });
      const child = logger.child({ requestId: '123' });

      child.info(TestFactory.body('test message'));

      const message = logs[0]?.args[0] as string;

      assert.match(message, /^\[App\]/u);
    });

    void it('should inherit timestamp setting from parent', () => {
      logs.length = 0;

      const logger = ConsoleLogger.create({
        includeTimestamp: true,
        level: 'info'
      });
      const child = logger.child({ requestId: '123' });

      child.info(TestFactory.body('test message'));

      const message = logs[0]?.args[0] as string;

      assert.match(message, /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/u);
    });
  });

  void describe('parent logger independence', () => {
    void it('should not affect parent logger when creating child', () => {
      logs.length = 0;

      const logger = ConsoleLogger.create({ level: 'info' });

      logger.child({ requestId: '123' });
      logger.info(TestFactory.body('parent message'));

      const message = logs[0]?.args[0] as string;

      assert.doesNotMatch(message, /requestId/u);
    });

    void it('should allow parent and child to log independently', () => {
      logs.length = 0;

      const logger = ConsoleLogger.create({ level: 'info' });
      const child = logger.child({ requestId: '123' });

      logger.info(TestFactory.body('parent message'));
      child.info(TestFactory.body('child message'));

      assert.strictEqual(logs.length, 2);

      const parentMessage = logs[0]?.args[0] as string;
      const childMessage = logs[1]?.args[0] as string;

      assert.doesNotMatch(parentMessage, /requestId/u);
      assert.match(childMessage, /requestId/u);
    });
  });
});
