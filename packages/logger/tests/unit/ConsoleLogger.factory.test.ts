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

void describe('ConsoleLogger.create()', () => {
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

  void describe('factory function', () => {
    void it('should create logger with default INFO level', () => {
      logs.length = 0;

      const logger = ConsoleLogger.create();

      logger.debug(TestFactory.body('debug'));
      logger.info(TestFactory.body('info'));

      assert.strictEqual(logs.length, 1);
      assert.strictEqual(logs[0]?.level, 'info');
    });

    void it('should create logger with specified level', () => {
      logs.length = 0;

      const logger = ConsoleLogger.create({ level: LogLevel.DEBUG });

      logger.debug(TestFactory.body('debug'));

      assert.strictEqual(logs.length, 1);
      assert.strictEqual(logs[0]?.level, 'debug');
    });

    void it('should create logger with string level', () => {
      logs.length = 0;

      const logger = ConsoleLogger.create({ level: 'warn' });

      logger.info(TestFactory.body('info'));
      logger.warn(TestFactory.body('warn'));

      assert.strictEqual(logs.length, 1);
      assert.strictEqual(logs[0]?.level, 'warn');
    });

    void it('should create logger with prefix', () => {
      logs.length = 0;

      const logger = ConsoleLogger.create({
        level: 'info',
        prefix: '[Test]'
      });

      logger.info(TestFactory.body('message'));

      assert.strictEqual(logs[0]?.args[0], '[Test] message');
    });

    void it('should create logger with timestamp', () => {
      logs.length = 0;

      const logger = ConsoleLogger.create({
        includeTimestamp: true,
        level: 'info'
      });

      logger.info(TestFactory.body('message'));

      const message = logs[0]?.args[0] as string;

      assert.match(message, /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] message$/u);
    });

    void it('should return ConsoleLogger instance', () => {
      const logger = ConsoleLogger.create();

      assert.ok(logger instanceof ConsoleLogger);
    });
  });
});
