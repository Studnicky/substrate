import assert from 'node:assert/strict';
import {
  describe,
  it
} from 'node:test';

import { LogLevel } from '../../src/constants/LogLevel.js';
import { PinoLogger } from '../../src/index.js';

import { TestFactory } from './TestFactory.js';

void describe('PinoLogger wrapper functionality', () => {
  void describe('log methods with LogDataType', () => {
    void it('should handle log body with context', () => {
      const logger = PinoLogger.create({
        level: 'trace',
        pretty: false
      });

      assert.doesNotThrow(() => {
        logger.info(TestFactory.body('test', { key: 'value' }));
      });
    });

    void it('should handle log fault from error', () => {
      const logger = PinoLogger.create({
        level: 'trace',
        pretty: false
      });

      assert.doesNotThrow(() => {
        logger.debug(TestFactory.body('test', { key1: 'value1' }));
      });
    });

    void it('should handle log body without additional context', () => {
      const logger = PinoLogger.create({
        level: 'trace',
        pretty: false
      });

      assert.doesNotThrow(() => {
        logger.trace(TestFactory.body('message only'));
        logger.debug(TestFactory.body('message only'));
        logger.info(TestFactory.body('message only'));
        logger.warn(TestFactory.body('message only'));
        logger.error(TestFactory.body('message only'));
      });
    });

    void it('should handle error faults correctly', () => {
      const logger = PinoLogger.create({
        level: 'error',
        pretty: false
      });
      const error = new Error('test error');

      assert.doesNotThrow(() => {
        logger.error(TestFactory.fault(error));
      });
    });

    void it('should handle log body with empty context', () => {
      const logger = PinoLogger.create({
        level: 'info',
        pretty: false
      });

      assert.doesNotThrow(() => {
        logger.info(TestFactory.body('simple message'));
      });
    });

    void it('should handle log body with complex context', () => {
      const logger = PinoLogger.create({
        level: 'info',
        pretty: false
      });
      const body = TestFactory.body('complex object', {
        array: [
          1,
          2,
          { nested: true }
        ],
        level1: { level2: { level3: { value: 'deep' } } }
      });

      assert.doesNotThrow(() => {
        logger.info(body);
      });
    });
  });

  void describe('child logger with edge cases', () => {
    void it('should create child with empty metadata object', () => {
      const logger = PinoLogger.create();
      const child = logger.child({});

      assert.ok(child instanceof PinoLogger);
      assert.doesNotThrow(() => {
        child.info(TestFactory.body('test'));
      });
    });

    void it('should create deeply nested children', () => {
      const logger = PinoLogger.create();
      const child1 = logger.child({ level1: 'value1' });
      const child2 = child1.child({ level2: 'value2' });
      const child3 = child2.child({ level3: 'value3' });
      const child4 = child3.child({ level4: 'value4' });

      assert.ok(child4 instanceof PinoLogger);
      assert.doesNotThrow(() => {
        child4.info(TestFactory.body('deeply nested'));
      });
    });

    void it('should handle child with metadata containing null values', () => {
      const logger = PinoLogger.create();
      const child = logger.child({
        nullValue: null,
        undefinedValue: undefined
      });

      assert.ok(child instanceof PinoLogger);
      assert.doesNotThrow(() => {
        child.info(TestFactory.body('test with null metadata'));
      });
    });

    void it('should create multiple independent children from same parent', () => {
      const logger = PinoLogger.create();
      const child1 = logger.child({ id: 'child1' });
      const child2 = logger.child({ id: 'child2' });
      const child3 = logger.child({ id: 'child3' });

      assert.ok(child1 instanceof PinoLogger);
      assert.ok(child2 instanceof PinoLogger);
      assert.ok(child3 instanceof PinoLogger);

      assert.doesNotThrow(() => {
        child1.info(TestFactory.body('from child1'));
        child2.info(TestFactory.body('from child2'));
        child3.info(TestFactory.body('from child3'));
      });
    });

    void it('should handle child from child created by builder', () => {
      const logger = PinoLogger.builder()
        .level('info')
        .metadata({ root: 'value' })
        .build();

      const child = logger.child({ child: 'metadata' });
      const grandchild = child.child({ grandchild: 'metadata' });

      assert.ok(grandchild instanceof PinoLogger);
      assert.doesNotThrow(() => {
        grandchild.info(TestFactory.body('grandchild message'));
      });
    });
  });

  void describe('configuration edge cases', () => {
    void it('should handle all log levels as strings', () => {
      const levels: Array<'debug' | 'error' | 'info' | 'silent' | 'trace' | 'warn'> = [
        'trace',
        'debug',
        'info',
        'warn',
        'error',
        'silent'
      ];

      for (const level of levels) {
        assert.doesNotThrow(() => {
          const logger = PinoLogger.create({ level });

          assert.ok(logger instanceof PinoLogger);
        });
      }
    });

    void it('should handle all log levels as enums', () => {
      const levels = [
        LogLevel.TRACE,
        LogLevel.DEBUG,
        LogLevel.INFO,
        LogLevel.WARN,
        LogLevel.ERROR,
        LogLevel.SILENT
      ];

      for (const level of levels) {
        assert.doesNotThrow(() => {
          const logger = PinoLogger.create({ level });

          assert.ok(logger instanceof PinoLogger);
        });
      }
    });

    void it('should handle pretty true explicitly', () => {
      const logger = PinoLogger.create({ pretty: true });

      assert.ok(logger instanceof PinoLogger);
      assert.doesNotThrow(() => {
        logger.info(TestFactory.body('pretty test'));
      });
    });

    void it('should handle pretty false explicitly', () => {
      const logger = PinoLogger.create({ pretty: false });

      assert.ok(logger instanceof PinoLogger);
      assert.doesNotThrow(() => {
        logger.info(TestFactory.body('not pretty test'));
      });
    });

    void it('should handle metadata with special characters in keys', () => {
      const logger = PinoLogger.create({
        metadata: {
          'key-with-dash': 'value',
          'key.with.dot': 'value',
          'key@with@at': 'value',
          key_with_underscore: 'value'
        }
      });

      assert.ok(logger instanceof PinoLogger);
      assert.doesNotThrow(() => {
        logger.info(TestFactory.body('special keys test'));
      });
    });

    void it('should handle empty string in metadata values', () => {
      const logger = PinoLogger.create({
        metadata: {
          emptyString: '',
          normalValue: 'test'
        }
      });

      assert.ok(logger instanceof PinoLogger);
      assert.doesNotThrow(() => {
        logger.info(TestFactory.body('empty string metadata'));
      });
    });

    void it('should handle numeric metadata values', () => {
      const logger = PinoLogger.create({
        metadata: {
          float: 3.14,
          infinity: Infinity,
          nan: Number.NaN,
          negative: -42,
          positive: 42,
          zero: 0
        }
      });

      assert.ok(logger instanceof PinoLogger);
      assert.doesNotThrow(() => {
        logger.info(TestFactory.body('numeric metadata'));
      });
    });
  });

  void describe('factory method variations', () => {
    void it('should create with no arguments', () => {
      const logger = PinoLogger.create();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should create with empty config object', () => {
      const logger = PinoLogger.create({});

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should create with partial config', () => {
      const logger1 = PinoLogger.create({ level: 'debug' });
      const logger2 = PinoLogger.create({ pretty: false });
      const logger3 = PinoLogger.create({ metadata: { test: 'value' } });

      assert.ok(logger1 instanceof PinoLogger);
      assert.ok(logger2 instanceof PinoLogger);
      assert.ok(logger3 instanceof PinoLogger);
    });
  });

  void describe('message formatting edge cases', () => {
    void it('should handle empty string messages', () => {
      const logger = PinoLogger.create({ level: 'trace' });

      assert.doesNotThrow(() => {
        logger.trace(TestFactory.body(''));
        logger.debug(TestFactory.body(''));
        logger.info(TestFactory.body(''));
        logger.warn(TestFactory.body(''));
        logger.error(TestFactory.body(''));
      });
    });

    void it('should handle very long messages', () => {
      const logger = PinoLogger.create();
      const longMessage = 'a'.repeat(10_000);

      assert.doesNotThrow(() => {
        logger.info(TestFactory.body(longMessage));
      });
    });

    void it('should handle messages with newlines', () => {
      const logger = PinoLogger.create();

      assert.doesNotThrow(() => {
        logger.info(TestFactory.body('line1\nline2\nline3'));
      });
    });

    void it('should handle messages with special characters', () => {
      const logger = PinoLogger.create();

      assert.doesNotThrow(() => {
        logger.info(TestFactory.body('Special chars: !@#$%^&*()_+-=[]{}|;:,.<>?'));
        logger.info(TestFactory.body('Unicode: chinese-characters and accents'));
      });
    });

    void it('should handle messages with tabs', () => {
      const logger = PinoLogger.create();

      assert.doesNotThrow(() => {
        logger.info(TestFactory.body('tab\there\tand\there'));
      });
    });
  });

  void describe('method existence and type', () => {
    void it('should have all required Logger interface methods', () => {
      const logger = PinoLogger.create();

      assert.strictEqual(typeof logger.trace, 'function');
      assert.strictEqual(typeof logger.debug, 'function');
      assert.strictEqual(typeof logger.info, 'function');
      assert.strictEqual(typeof logger.warn, 'function');
      assert.strictEqual(typeof logger.error, 'function');
      assert.strictEqual(typeof logger.child, 'function');
    });

    void it('should have static factory methods', () => {
      assert.strictEqual(typeof PinoLogger.create, 'function');
      assert.strictEqual(typeof PinoLogger.builder, 'function');
    });
  });

  void describe('instance independence', () => {
    void it('should create independent logger instances', () => {
      const logger1 = PinoLogger.create({ level: 'debug' });
      const logger2 = PinoLogger.create({ level: 'error' });

      assert.ok(logger1 instanceof PinoLogger);
      assert.ok(logger2 instanceof PinoLogger);
      assert.notStrictEqual(logger1, logger2);
    });

    void it('should not share state between instances', () => {
      const logger1 = PinoLogger.create({ metadata: { id: 'logger1' } });
      const logger2 = PinoLogger.create({ metadata: { id: 'logger2' } });

      const child1 = logger1.child({ child: 'child1' });
      const child2 = logger2.child({ child: 'child2' });

      assert.notStrictEqual(child1, child2);
      assert.doesNotThrow(() => {
        child1.info(TestFactory.body('from logger1 child'));
        child2.info(TestFactory.body('from logger2 child'));
      });
    });
  });
});
