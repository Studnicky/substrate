import assert from 'node:assert/strict';
import {
  after,
  before,
  describe,
  it
} from 'node:test';

import { NoOpLogger } from '../../src/index.js';

import { TestFactory } from './TestFactory.js';

void describe('NoOpLogger', () => {
  const originalConsole = {
    debug: console.debug,
    error: console.error,
    info: console.info,
    trace: console.trace,
    warn: console.warn
  };

  let logCount = 0;

  const incrementLog = () => {
    logCount++;
  };

  before(() => {
    console.trace = incrementLog;
    console.debug = incrementLog;
    console.info = incrementLog;
    console.warn = incrementLog;
    console.error = incrementLog;
  });

  after(() => {
    console.trace = originalConsole.trace;
    console.debug = originalConsole.debug;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });

  void describe('NoOpLogger instance', () => {
    void it('should not log trace messages', () => {
      logCount = 0;

      const logger = NoOpLogger.create();

      logger.trace(TestFactory.body('test message'));

      assert.strictEqual(logCount, 0);
    });

    void it('should not log debug messages', () => {
      logCount = 0;

      const logger = NoOpLogger.create();

      logger.debug(TestFactory.body('test message'));

      assert.strictEqual(logCount, 0);
    });

    void it('should not log info messages', () => {
      logCount = 0;

      const logger = NoOpLogger.create();

      logger.info(TestFactory.body('test message'));

      assert.strictEqual(logCount, 0);
    });

    void it('should not log warn messages', () => {
      logCount = 0;

      const logger = NoOpLogger.create();

      logger.warn(TestFactory.body('test message'));

      assert.strictEqual(logCount, 0);
    });

    void it('should not log error messages', () => {
      logCount = 0;

      const logger = NoOpLogger.create();

      logger.error(TestFactory.body('test message'));

      assert.strictEqual(logCount, 0);
    });

    void it('should not log any messages with multiple calls', () => {
      logCount = 0;

      const logger = NoOpLogger.create();

      logger.trace(TestFactory.body('trace message'));
      logger.debug(TestFactory.body('debug message'));
      logger.info(TestFactory.body('info message'));
      logger.warn(TestFactory.body('warn message'));
      logger.error(TestFactory.body('error message'));

      assert.strictEqual(logCount, 0);
    });
  });
});
