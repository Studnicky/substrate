import assert from 'node:assert/strict';
import {
  describe,
  it
} from 'node:test';

import { LogLevel } from '../../src/constants/LogLevel.js';
import {
  ConsoleLogger,
  ConsoleLoggerBuilder
} from '../../src/index.js';

import { TestFactory } from './TestFactory.js';

void describe('ConsoleLoggerBuilder wrapper functionality', () => {
  void describe('builder instantiation', () => {
    void it('should create builder via static method', () => {
      const builder = ConsoleLogger.builder();

      assert.ok(builder instanceof ConsoleLoggerBuilder);
    });

    void it('should create builder via static create method', () => {
      const builder = ConsoleLoggerBuilder.create((config) => {
        return new ConsoleLogger(config);
      });

      assert.ok(builder instanceof ConsoleLoggerBuilder);
    });
  });

  void describe('builder method chaining', () => {
    void it('should return builder instance from level()', () => {
      const builder = ConsoleLogger.builder();
      const result = builder.level('info');

      assert.strictEqual(result, builder);
    });

    void it('should return builder instance from prefix()', () => {
      const builder = ConsoleLogger.builder();
      const result = builder.prefix('[App]');

      assert.strictEqual(result, builder);
    });

    void it('should return builder instance from includeTimestamp()', () => {
      const builder = ConsoleLogger.builder();
      const result = builder.includeTimestamp(true);

      assert.strictEqual(result, builder);
    });

    void it('should return builder instance from metadata()', () => {
      const builder = ConsoleLogger.builder();
      const result = builder.metadata({ test: 'value' });

      assert.strictEqual(result, builder);
    });

    void it('should support full method chain', () => {
      const builder = ConsoleLogger.builder();
      const result = builder
        .level('debug')
        .prefix('[Test]')
        .includeTimestamp(true)
        .metadata({ version: '1.0' });

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
        const logger = ConsoleLogger.builder()
          .level(level)
          .build();

        assert.ok(logger instanceof ConsoleLogger);
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
        const logger = ConsoleLogger.builder()
          .level(level)
          .build();

        assert.ok(logger instanceof ConsoleLogger);
      }
    });

    void it('should accept empty prefix', () => {
      const logger = ConsoleLogger.builder()
        .prefix('')
        .build();

      assert.ok(logger instanceof ConsoleLogger);
    });

    void it('should accept prefix with special characters', () => {
      const logger = ConsoleLogger.builder()
        .prefix('[!@#$%^&*()]')
        .build();

      assert.ok(logger instanceof ConsoleLogger);
    });

    void it('should accept includeTimestamp true', () => {
      const logger = ConsoleLogger.builder()
        .includeTimestamp(true)
        .build();

      assert.ok(logger instanceof ConsoleLogger);
    });

    void it('should accept includeTimestamp false', () => {
      const logger = ConsoleLogger.builder()
        .includeTimestamp(false)
        .build();

      assert.ok(logger instanceof ConsoleLogger);
    });

    void it('should accept empty metadata object', () => {
      const logger = ConsoleLogger.builder()
        .metadata({})
        .build();

      assert.ok(logger instanceof ConsoleLogger);
    });

    void it('should accept metadata with various types', () => {
      const logger = ConsoleLogger.builder()
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

      assert.ok(logger instanceof ConsoleLogger);
    });
  });

  void describe('builder multiple calls', () => {
    void it('should allow calling level() multiple times', () => {
      const logger = ConsoleLogger.builder()
        .level('debug')
        .level('info')
        .level('warn')
        .build();

      assert.ok(logger instanceof ConsoleLogger);
    });

    void it('should allow calling prefix() multiple times', () => {
      const logger = ConsoleLogger.builder()
        .prefix('[First]')
        .prefix('[Second]')
        .prefix('[Final]')
        .build();

      assert.ok(logger instanceof ConsoleLogger);
    });

    void it('should allow calling includeTimestamp() multiple times', () => {
      const logger = ConsoleLogger.builder()
        .includeTimestamp(true)
        .includeTimestamp(false)
        .includeTimestamp(true)
        .build();

      assert.ok(logger instanceof ConsoleLogger);
    });

    void it('should allow calling metadata() multiple times', () => {
      const logger = ConsoleLogger.builder()
        .metadata({ first: '1' })
        .metadata({ second: '2' })
        .metadata({ final: '3' })
        .build();

      assert.ok(logger instanceof ConsoleLogger);
    });
  });

  void describe('builder build variations', () => {
    void it('should build with no configuration', () => {
      const logger = ConsoleLogger.builder().build();

      assert.ok(logger instanceof ConsoleLogger);
    });

    void it('should build with single configuration', () => {
      const logger1 = ConsoleLogger.builder().level('debug')
        .build();
      const logger2 = ConsoleLogger.builder().prefix('[App]')
        .build();
      const logger3 = ConsoleLogger.builder().includeTimestamp(true)
        .build();
      const logger4 = ConsoleLogger.builder().metadata({ test: 'value' })
        .build();

      assert.ok(logger1 instanceof ConsoleLogger);
      assert.ok(logger2 instanceof ConsoleLogger);
      assert.ok(logger3 instanceof ConsoleLogger);
      assert.ok(logger4 instanceof ConsoleLogger);
    });

    void it('should build with partial configuration', () => {
      const logger = ConsoleLogger.builder()
        .level('info')
        .prefix('[App]')
        .build();

      assert.ok(logger instanceof ConsoleLogger);
    });

    void it('should build with full configuration', () => {
      const logger = ConsoleLogger.builder()
        .level('debug')
        .prefix('[App]')
        .includeTimestamp(true)
        .metadata({
          service: 'api',
          version: '1.0.0'
        })
        .build();

      assert.ok(logger instanceof ConsoleLogger);
    });
  });

  void describe('builder reuse scenarios', () => {
    void it('should allow building multiple loggers from same builder', () => {
      const builder = ConsoleLogger.builder()
        .level('info')
        .prefix('[App]');

      const logger1 = builder.build();
      const logger2 = builder.build();

      assert.ok(logger1 instanceof ConsoleLogger);
      assert.ok(logger2 instanceof ConsoleLogger);
      assert.notStrictEqual(logger1, logger2);
    });

    void it('should allow modifying builder after build', () => {
      const builder = ConsoleLogger.builder().level('info');
      const logger1 = builder.build();

      builder.level('debug');
      const logger2 = builder.build();

      assert.ok(logger1 instanceof ConsoleLogger);
      assert.ok(logger2 instanceof ConsoleLogger);
      assert.notStrictEqual(logger1, logger2);
    });

    void it('should create independent builders', () => {
      const builder1 = ConsoleLogger.builder().level('debug');
      const builder2 = ConsoleLogger.builder().level('error');

      const logger1 = builder1.build();
      const logger2 = builder2.build();

      assert.ok(logger1 instanceof ConsoleLogger);
      assert.ok(logger2 instanceof ConsoleLogger);
      assert.notStrictEqual(logger1, logger2);
    });
  });

  void describe('builder with child loggers', () => {
    void it('should create child from builder-created logger', () => {
      const logger = ConsoleLogger.builder()
        .level('info')
        .metadata({ parent: 'value' })
        .build();

      const child = logger.child({ child: 'value' });

      assert.ok(child instanceof ConsoleLogger);
    });

    void it('should create nested children from builder-created logger', () => {
      const logger = ConsoleLogger.builder()
        .level('info')
        .build();

      const child1 = logger.child({ level1: 'value' });
      const child2 = child1.child({ level2: 'value' });
      const child3 = child2.child({ level3: 'value' });

      assert.ok(child3 instanceof ConsoleLogger);
    });

    void it('should allow child loggers to inherit builder configuration', () => {
      const logger = ConsoleLogger.builder()
        .level('warn')
        .prefix('[App]')
        .includeTimestamp(true)
        .build();

      const child = logger.child({ requestId: '123' });

      assert.ok(child instanceof ConsoleLogger);
      assert.doesNotThrow(() => {
        child.warn(TestFactory.body('test warning'));
      });
    });
  });

  void describe('builder interface compliance', () => {
    void it('should have all required builder methods', () => {
      const builder = ConsoleLogger.builder();

      assert.strictEqual(typeof builder.level, 'function');
      assert.strictEqual(typeof builder.prefix, 'function');
      assert.strictEqual(typeof builder.includeTimestamp, 'function');
      assert.strictEqual(typeof builder.metadata, 'function');
      assert.strictEqual(typeof builder.build, 'function');
    });

    void it('should implement ConsoleLoggerBuilderInterface', () => {
      const builder = ConsoleLogger.builder();

      assert.ok('level' in builder);
      assert.ok('prefix' in builder);
      assert.ok('includeTimestamp' in builder);
      assert.ok('metadata' in builder);
      assert.ok('build' in builder);
    });
  });

  void describe('builder order independence', () => {
    void it('should produce same result regardless of method order', () => {
      const logger1 = ConsoleLogger.builder()
        .level('debug')
        .prefix('[App]')
        .includeTimestamp(true)
        .build();

      const logger2 = ConsoleLogger.builder()
        .includeTimestamp(true)
        .prefix('[App]')
        .level('debug')
        .build();

      const logger3 = ConsoleLogger.builder()
        .prefix('[App]')
        .includeTimestamp(true)
        .level('debug')
        .build();

      assert.ok(logger1 instanceof ConsoleLogger);
      assert.ok(logger2 instanceof ConsoleLogger);
      assert.ok(logger3 instanceof ConsoleLogger);
    });
  });
});
