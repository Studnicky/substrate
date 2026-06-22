import assert from 'node:assert/strict';
import {
  describe,
  it
} from 'node:test';

import { LogLevel } from '../../src/constants/LogLevel.js';
import { PinoLogger } from '../../src/index.js';

import { TestFactory } from './TestFactory.js';

void describe('PinoLogger', () => {
  void describe('instantiation', () => {
    void it('should create logger with new', () => {
      const logger = new PinoLogger({ level: LogLevel.DEBUG });

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should create logger with .create()', () => {
      const logger = PinoLogger.create({ level: LogLevel.DEBUG });

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should create logger with .builder()', () => {
      const logger = PinoLogger.builder()
        .level(LogLevel.DEBUG)
        .build();

      assert.ok(logger instanceof PinoLogger);
    });
  });

  void describe('log methods', () => {
    void it('should have all log methods', () => {
      const logger = PinoLogger.create();

      assert.ok(typeof logger.trace === 'function');
      assert.ok(typeof logger.debug === 'function');
      assert.ok(typeof logger.info === 'function');
      assert.ok(typeof logger.warn === 'function');
      assert.ok(typeof logger.error === 'function');
    });

    void it('should not throw when calling log methods', () => {
      const logger = PinoLogger.create({ level: 'trace' });

      assert.doesNotThrow(() => {
        logger.trace(TestFactory.body('trace message'));
        logger.debug(TestFactory.body('debug message'));
        logger.info(TestFactory.body('info message'));
        logger.warn(TestFactory.body('warn message'));
        logger.error(TestFactory.body('error message'));
      });
    });

    void it('should handle log methods with context', () => {
      const logger = PinoLogger.create();

      assert.doesNotThrow(() => {
        logger.info(TestFactory.body('message', { key: 'value' }));
        logger.error(TestFactory.fault(new Error('test error')));
      });
    });
  });

  void describe('child logger', () => {
    void it('should create child logger with .child()', () => {
      const logger = PinoLogger.create();
      const child = logger.child({ requestId: '123' });

      assert.ok(child instanceof PinoLogger);
    });

    void it('should create nested child loggers', () => {
      const logger = PinoLogger.create();
      const child1 = logger.child({ requestId: '123' });
      const child2 = child1.child({ userId: 'abc' });

      assert.ok(child2 instanceof PinoLogger);
    });

    void it('should not throw when logging from child', () => {
      const logger = PinoLogger.create();
      const child = logger.child({ requestId: '123' });

      assert.doesNotThrow(() => {
        child.info(TestFactory.body('child message'));
      });
    });
  });

  void describe('configuration', () => {
    void it('should accept string log level', () => {
      assert.doesNotThrow(() => {
        PinoLogger.create({ level: 'debug' });
      });
    });

    void it('should accept LogLevel enum', () => {
      assert.doesNotThrow(() => {
        PinoLogger.create({ level: LogLevel.DEBUG });
      });
    });

    void it('should create with pretty option', () => {
      assert.doesNotThrow(() => {
        PinoLogger.create({ pretty: true });
      });
    });

    void it('should create with metadata', () => {
      assert.doesNotThrow(() => {
        PinoLogger.create({
          metadata: {
            service: 'api',
            version: '1.0.0'
          }
        });
      });
    });
  });

  void describe('builder pattern', () => {
    void it('should support method chaining', () => {
      const logger = PinoLogger.builder()
        .level('debug')
        .pretty(true)
        .metadata({ service: 'api' })
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should build with all options', () => {
      assert.doesNotThrow(() => {
        PinoLogger.builder()
          .level(LogLevel.TRACE)
          .pretty(false)
          .metadata({ app: 'test' })
          .build();
      });
    });
  });
});
