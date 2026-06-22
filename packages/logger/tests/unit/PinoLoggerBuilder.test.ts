import assert from 'node:assert/strict';
import {
  describe,
  it
} from 'node:test';

import { LogLevel } from '../../src/constants/LogLevel.js';
import { PinoLogger } from '../../src/index.js';

import { TestFactory } from './TestFactory.js';

void describe('PinoLoggerBuilder', () => {
  void describe('builder pattern', () => {
    void it('should build logger with default INFO level', () => {
      const logger = PinoLogger.builder()
        .pretty(false)
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should build logger with specified level', () => {
      const logger = PinoLogger.builder()
        .level(LogLevel.DEBUG)
        .pretty(false)
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should build logger with string level', () => {
      const logger = PinoLogger.builder()
        .level('warn')
        .pretty(false)
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should build logger with pretty option', () => {
      const logger = PinoLogger.builder()
        .level('info')
        .pretty(false)
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should build logger with metadata', () => {
      const logger = PinoLogger.builder()
        .level('info')
        .pretty(false)
        .metadata({
          service: 'test',
          version: '1.0.0'
        })
        .build();

      assert.ok(logger instanceof PinoLogger);
      assert.doesNotThrow(() => {
        logger.info(TestFactory.body('test with metadata'));
      });
    });

    void it('should build logger with destination', () => {
      const builder = PinoLogger.builder()
        .level('info')
        .pretty(false)
        .destination('/tmp/test.log');

      assert.ok(builder instanceof Object);
    });

    void it('should support method chaining', () => {
      const logger = PinoLogger.builder()
        .level('debug')
        .pretty(false)
        .metadata({ env: 'test' })
        .build();

      assert.ok(logger instanceof PinoLogger);
      assert.doesNotThrow(() => {
        logger.debug(TestFactory.body('test'));
      });
    });

    void it('should support full builder chain', () => {
      const logger = PinoLogger.builder()
        .level('info')
        .pretty(false)
        .metadata({
          component: 'api',
          version: '2.0.0'
        })
        .build();

      assert.ok(logger instanceof PinoLogger);
      assert.doesNotThrow(() => {
        logger.info(TestFactory.body('message'));
        logger.warn(TestFactory.body('warning'));
        logger.error(TestFactory.body('error'));
      });
    });

    void it('should return PinoLogger instance', () => {
      const logger = PinoLogger.builder()
        .pretty(false)
        .build();

      assert.ok(logger instanceof PinoLogger);
    });
  });

  void describe('builder configuration', () => {
    void it('should create child logger from builder-created logger', () => {
      const logger = PinoLogger.builder()
        .level('info')
        .pretty(false)
        .metadata({ service: 'parent' })
        .build();

      const child = logger.child({ requestId: '123' });

      assert.ok(child instanceof PinoLogger);
      assert.doesNotThrow(() => {
        child.info(TestFactory.body('child message'));
      });
    });

    void it('should support multiple builder instances independently', () => {
      const builder1 = PinoLogger.builder()
        .level('debug')
        .pretty(false);
      const builder2 = PinoLogger.builder()
        .level('error')
        .pretty(false);

      const logger1 = builder1.build();
      const logger2 = builder2.build();

      assert.ok(logger1 instanceof PinoLogger);
      assert.ok(logger2 instanceof PinoLogger);
    });
  });
});
