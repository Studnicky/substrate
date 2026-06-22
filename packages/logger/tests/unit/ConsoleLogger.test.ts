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

void describe('ConsoleLogger', () => {
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

  void describe('log level filtering', () => {
    void it('should log only messages at or above INFO level by default', () => {
      logs.length = 0;

      const logger = new ConsoleLogger();

      logger.trace(TestFactory.body('trace message'));
      logger.debug(TestFactory.body('debug message'));
      logger.info(TestFactory.body('info message'));
      logger.warn(TestFactory.body('warn message'));
      logger.error(TestFactory.body('error message'));

      assert.strictEqual(logs.length, 3);
      assert.strictEqual(logs[0]?.level, 'info');
      assert.strictEqual(logs[1]?.level, 'warn');
      assert.strictEqual(logs[2]?.level, 'error');
    });

    void it('should log only messages at or above DEBUG level', () => {
      logs.length = 0;

      const logger = new ConsoleLogger({ level: LogLevel.DEBUG });

      logger.trace(TestFactory.body('trace message'));
      logger.debug(TestFactory.body('debug message'));
      logger.info(TestFactory.body('info message'));
      logger.warn(TestFactory.body('warn message'));
      logger.error(TestFactory.body('error message'));

      assert.strictEqual(logs.length, 4);
      assert.strictEqual(logs[0]?.level, 'debug');
      assert.strictEqual(logs[1]?.level, 'info');
      assert.strictEqual(logs[2]?.level, 'warn');
      assert.strictEqual(logs[3]?.level, 'error');
    });

    void it('should log only messages at or above WARN level', () => {
      logs.length = 0;

      const logger = new ConsoleLogger({ level: LogLevel.WARN });

      logger.trace(TestFactory.body('trace message'));
      logger.debug(TestFactory.body('debug message'));
      logger.info(TestFactory.body('info message'));
      logger.warn(TestFactory.body('warn message'));
      logger.error(TestFactory.body('error message'));

      assert.strictEqual(logs.length, 2);
      assert.strictEqual(logs[0]?.level, 'warn');
      assert.strictEqual(logs[1]?.level, 'error');
    });

    void it('should log all messages at TRACE level', () => {
      logs.length = 0;

      const logger = new ConsoleLogger({ level: LogLevel.TRACE });

      logger.trace(TestFactory.body('trace message'));
      logger.debug(TestFactory.body('debug message'));
      logger.info(TestFactory.body('info message'));

      assert.strictEqual(logs.length, 3);
      assert.strictEqual(logs[0]?.level, 'trace');
      assert.strictEqual(logs[1]?.level, 'debug');
      assert.strictEqual(logs[2]?.level, 'info');
    });

    void it('should log no messages at SILENT level', () => {
      logs.length = 0;

      const logger = new ConsoleLogger({ level: LogLevel.SILENT });

      logger.trace(TestFactory.body('trace message'));
      logger.debug(TestFactory.body('debug message'));
      logger.info(TestFactory.body('info message'));
      logger.warn(TestFactory.body('warn message'));
      logger.error(TestFactory.body('error message'));

      assert.strictEqual(logs.length, 0);
    });

    void it('should accept log level as string', () => {
      logs.length = 0;

      const logger = new ConsoleLogger({ level: 'debug' });

      logger.debug(TestFactory.body('debug message'));
      logger.info(TestFactory.body('info message'));

      assert.strictEqual(logs.length, 2);
    });
  });

  void describe('message formatting', () => {
    void it('should add prefix to messages', () => {
      logs.length = 0;

      const logger = new ConsoleLogger({
        level: LogLevel.INFO,
        prefix: '[MyApp]'
      });

      logger.info(TestFactory.body('test message'));

      assert.strictEqual(logs.length, 1);
      assert.strictEqual(logs[0]?.args[0], '[MyApp] test message');
    });

    void it('should add timestamp to messages', () => {
      logs.length = 0;

      const logger = new ConsoleLogger({
        includeTimestamp: true,
        level: LogLevel.INFO
      });

      logger.info(TestFactory.body('test message'));

      assert.strictEqual(logs.length, 1);

      const message = logs[0]?.args[0] as string;

      assert.match(message, /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] test message$/u);
    });

    void it('should add both timestamp and prefix', () => {
      logs.length = 0;

      const logger = new ConsoleLogger({
        includeTimestamp: true,
        level: LogLevel.INFO,
        prefix: '[MyApp]'
      });

      logger.info(TestFactory.body('test message'));

      assert.strictEqual(logs.length, 1);

      const message = logs[0]?.args[0] as string;

      assert.match(message, /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[MyApp\] test message$/u);
    });

    void it('should pass log data as second argument', () => {
      logs.length = 0;

      const logger = new ConsoleLogger({ level: LogLevel.INFO });

      const body = TestFactory.body('test message', { foo: 'bar' });

      logger.info(body);

      assert.strictEqual(logs.length, 1);

      const logEntry = logs[0];

      assert.ok(logEntry);
      assert.strictEqual(logEntry.args.length, 2);
      assert.strictEqual(logEntry.args[0], 'test message');
      assert.deepStrictEqual(logEntry.args[1], body);
    });
  });

  void describe('constructor defaults', () => {
    void it('should use INFO level when no config provided', () => {
      logs.length = 0;

      const logger = new ConsoleLogger();

      logger.debug(TestFactory.body('debug message'));
      logger.info(TestFactory.body('info message'));

      assert.strictEqual(logs.length, 1);
      assert.strictEqual(logs[0]?.level, 'info');
    });

    void it('should have no prefix by default', () => {
      logs.length = 0;

      const logger = new ConsoleLogger({ level: LogLevel.INFO });

      logger.info(TestFactory.body('test message'));

      assert.strictEqual(logs[0]?.args[0], 'test message');
    });

    void it('should not include timestamp by default', () => {
      logs.length = 0;

      const logger = new ConsoleLogger({ level: LogLevel.INFO });

      logger.info(TestFactory.body('test message'));

      const message = logs[0]?.args[0] as string;

      assert.doesNotMatch(message, /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/u);
    });
  });
});
