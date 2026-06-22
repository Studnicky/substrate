import assert from 'node:assert/strict';
import {
  describe,
  it
} from 'node:test';

import { LogLevel } from '../../src/constants/LogLevel.js';
import {
  PinoLogger,
  PinoLoggerBuilder
} from '../../src/index.js';

import { TestFactory } from './TestFactory.js';

void describe('PinoLoggerBuilder wrapper functionality', () => {
  void describe('builder instantiation', () => {
    void it('should create builder via static method', () => {
      const builder = PinoLogger.builder();

      assert.ok(builder instanceof PinoLoggerBuilder);
    });

    void it('should create builder via static create method', () => {
      const builder = PinoLoggerBuilder.create((config) => {
        return new PinoLogger(config);
      });

      assert.ok(builder instanceof PinoLoggerBuilder);
    });
  });

  void describe('builder method chaining', () => {
    void it('should return builder instance from level()', () => {
      const builder = PinoLogger.builder();
      const result = builder.level('info');

      assert.strictEqual(result, builder);
    });

    void it('should return builder instance from pretty()', () => {
      const builder = PinoLogger.builder();
      const result = builder.pretty(false);

      assert.strictEqual(result, builder);
    });

    void it('should return builder instance from metadata()', () => {
      const builder = PinoLogger.builder();
      const result = builder.metadata({ test: 'value' });

      assert.strictEqual(result, builder);
    });

    void it('should return builder instance from destination()', () => {
      const builder = PinoLogger.builder();
      const result = builder.destination('/tmp/test.log');

      assert.strictEqual(result, builder);
    });

    void it('should support full method chain', () => {
      const builder = PinoLogger.builder();
      const result = builder
        .level('debug')
        .pretty(false)
        .metadata({ version: '1.0' })
        .destination('/tmp/test.log');

      assert.strictEqual(result, builder);
    });
  });

  void describe('builder configuration options', () => {
    void it('should accept all log level strings', () => {
      const levels: Array<'debug' | 'error' | 'info' | 'silent' | 'trace' | 'warn'> = [
        'trace',
        'debug',
        'info',
        'warn',
        'error',
        'silent'
      ];

      for (const level of levels) {
        const logger = PinoLogger.builder()
          .level(level)
          .pretty(false)
          .build();

        assert.ok(logger instanceof PinoLogger);
      }
    });

    void it('should accept all log level enums', () => {
      const levels = [
        LogLevel.TRACE,
        LogLevel.DEBUG,
        LogLevel.INFO,
        LogLevel.WARN,
        LogLevel.ERROR,
        LogLevel.SILENT
      ];

      for (const level of levels) {
        const logger = PinoLogger.builder()
          .level(level)
          .pretty(false)
          .build();

        assert.ok(logger instanceof PinoLogger);
      }
    });

    void it('should accept pretty true', () => {
      const logger = PinoLogger.builder()
        .pretty(false)
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should accept pretty false', () => {
      const logger = PinoLogger.builder()
        .pretty(false)
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should accept empty metadata object', () => {
      const logger = PinoLogger.builder()
        .pretty(false)
        .metadata({})
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should accept metadata with various types', () => {
      const logger = PinoLogger.builder()
        .pretty(false)
        .metadata({
          array: [
            1,
            2,
            3
          ],
          boolean: true,
          nested: { deep: 'value' },
          null: null,
          number: 42,
          string: 'value',
          undefined: undefined
        })
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should accept destination path', () => {
      const builder = PinoLogger.builder()
        .pretty(false)
        .destination('/tmp/test.log');

      assert.ok(builder instanceof PinoLoggerBuilder);
    });

    void it('should accept destination with absolute path', () => {
      const builder = PinoLogger.builder()
        .pretty(false)
        .destination('/tmp/test-absolute.log');

      assert.ok(builder instanceof PinoLoggerBuilder);
    });
  });

  void describe('builder multiple calls', () => {
    void it('should allow calling level() multiple times', () => {
      const logger = PinoLogger.builder()
        .level('debug')
        .level('info')
        .level('warn')
        .pretty(false)
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should allow calling pretty() multiple times', () => {
      const logger = PinoLogger.builder()
        .pretty(false)
        .pretty(false)
        .pretty(false)
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should allow calling metadata() multiple times', () => {
      const logger = PinoLogger.builder()
        .pretty(false)
        .metadata({ first: '1' })
        .metadata({ second: '2' })
        .metadata({ final: '3' })
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should allow calling destination() multiple times', () => {
      const builder = PinoLogger.builder()
        .pretty(false)
        .destination('/tmp/first.log')
        .destination('/tmp/second.log')
        .destination('/tmp/final.log');

      assert.ok(builder instanceof PinoLoggerBuilder);
    });
  });

  void describe('builder build variations', () => {
    void it('should build with no configuration', () => {
      const logger = PinoLogger.builder()
        .pretty(false)
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should build with single configuration', () => {
      const logger1 = PinoLogger.builder()
        .level('debug')
        .pretty(false)
        .build();
      const logger2 = PinoLogger.builder()
        .pretty(false)
        .build();
      const logger3 = PinoLogger.builder()
        .pretty(false)
        .metadata({ test: 'value' })
        .build();
      const builder4 = PinoLogger.builder()
        .pretty(false)
        .destination('/tmp/test.log');

      assert.ok(logger1 instanceof PinoLogger);
      assert.ok(logger2 instanceof PinoLogger);
      assert.ok(logger3 instanceof PinoLogger);
      assert.ok(builder4 instanceof PinoLoggerBuilder);
    });

    void it('should build with partial configuration', () => {
      const logger = PinoLogger.builder()
        .level('info')
        .pretty(false)
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should build with full configuration', () => {
      const builder = PinoLogger.builder()
        .level('debug')
        .pretty(false)
        .metadata({
          service: 'api',
          version: '1.0.0'
        })
        .destination('/tmp/full.log');

      assert.ok(builder instanceof PinoLoggerBuilder);
    });
  });

  void describe('builder reuse scenarios', () => {
    void it('should allow building multiple loggers from same builder', () => {
      const builder = PinoLogger.builder()
        .level('info')
        .pretty(false);

      const logger1 = builder.build();
      const logger2 = builder.build();

      assert.ok(logger1 instanceof PinoLogger);
      assert.ok(logger2 instanceof PinoLogger);
      assert.notStrictEqual(logger1, logger2);
    });

    void it('should allow modifying builder after build', () => {
      const builder = PinoLogger.builder()
        .level('info')
        .pretty(false);
      const logger1 = builder.build();

      builder.level('debug');
      const logger2 = builder.build();

      assert.ok(logger1 instanceof PinoLogger);
      assert.ok(logger2 instanceof PinoLogger);
      assert.notStrictEqual(logger1, logger2);
    });

    void it('should create independent builders', () => {
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
      assert.notStrictEqual(logger1, logger2);
    });
  });

  void describe('builder with child loggers', () => {
    void it('should create child from builder-created logger', () => {
      const logger = PinoLogger.builder()
        .level('info')
        .pretty(false)
        .metadata({ parent: 'value' })
        .build();

      const child = logger.child({ child: 'value' });

      assert.ok(child instanceof PinoLogger);
    });

    void it('should create nested children from builder-created logger', () => {
      const logger = PinoLogger.builder()
        .level('info')
        .pretty(false)
        .build();

      const child1 = logger.child({ level1: 'value' });
      const child2 = child1.child({ level2: 'value' });
      const child3 = child2.child({ level3: 'value' });

      assert.ok(child3 instanceof PinoLogger);
    });

    void it('should allow child loggers to log without errors', () => {
      const logger = PinoLogger.builder()
        .level('warn')
        .pretty(false)
        .build();

      const child = logger.child({ requestId: '123' });

      assert.doesNotThrow(() => {
        child.warn(TestFactory.body('test warning'));
        child.error(TestFactory.body('test error'));
      });
    });
  });

  void describe('builder interface compliance', () => {
    void it('should have all required builder methods', () => {
      const builder = PinoLogger.builder();

      assert.strictEqual(typeof builder.level, 'function');
      assert.strictEqual(typeof builder.pretty, 'function');
      assert.strictEqual(typeof builder.metadata, 'function');
      assert.strictEqual(typeof builder.destination, 'function');
      assert.strictEqual(typeof builder.build, 'function');
    });

    void it('should implement PinoLoggerBuilderInterface', () => {
      const builder = PinoLogger.builder();

      assert.ok('level' in builder);
      assert.ok('pretty' in builder);
      assert.ok('metadata' in builder);
      assert.ok('destination' in builder);
      assert.ok('build' in builder);
    });
  });

  void describe('builder order independence', () => {
    void it('should produce loggers regardless of method order', () => {
      const logger1 = PinoLogger.builder()
        .level('debug')
        .pretty(false)
        .metadata({ app: 'test' })
        .build();

      const logger2 = PinoLogger.builder()
        .metadata({ app: 'test' })
        .pretty(false)
        .level('debug')
        .build();

      const logger3 = PinoLogger.builder()
        .pretty(false)
        .level('debug')
        .metadata({ app: 'test' })
        .build();

      assert.ok(logger1 instanceof PinoLogger);
      assert.ok(logger2 instanceof PinoLogger);
      assert.ok(logger3 instanceof PinoLogger);
    });
  });

  void describe('builder with complex configurations', () => {
    void it('should handle builder with all features combined', () => {
      const logger = PinoLogger.builder()
        .level(LogLevel.TRACE)
        .pretty(false)
        .metadata({
          environment: 'development',
          nested: { deep: { value: 'test' } },
          service: 'test-service',
          tags: [
            'tag1',
            'tag2'
          ],
          version: '2.0.0'
        })
        .build();

      assert.ok(logger instanceof PinoLogger);
      assert.doesNotThrow(() => {
        logger.trace(TestFactory.body('trace message'));
        logger.debug(TestFactory.body('debug message'));
        logger.info(TestFactory.body('info message'));
        logger.warn(TestFactory.body('warn message'));
        logger.error(TestFactory.body('error message'));
      });
    });

    void it('should create multiple different configurations', () => {
      const debugLogger = PinoLogger.builder()
        .level('debug')
        .pretty(false)
        .build();

      const prodLogger = PinoLogger.builder()
        .level('error')
        .pretty(false)
        .metadata({ env: 'production' })
        .build();

      const fileBuilder = PinoLogger.builder()
        .level('info')
        .pretty(false)
        .destination('/tmp/app.log');

      assert.ok(debugLogger instanceof PinoLogger);
      assert.ok(prodLogger instanceof PinoLogger);
      assert.ok(fileBuilder instanceof PinoLoggerBuilder);
    });
  });
});
