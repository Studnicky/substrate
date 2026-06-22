import type { LogMetadataType } from '../../src/types/LogMetadataType.js';

import assert from 'node:assert/strict';
import {
  describe,
  it
} from 'node:test';

import {
  ConsoleLogger,
  PinoLogger
} from '../../src/index.js';

import { TestFactory } from './TestFactory.js';

void describe('LogMetadataType', () => {
  void describe('type compatibility', () => {
    void it('should accept record of unknown values', () => {
      const metadata: LogMetadataType = {
        boolean: true,
        null: null,
        number: 42,
        string: 'test',
        undefined: undefined
      };

      assert.strictEqual(metadata.string, 'test');
      assert.strictEqual(metadata.number, 42);
      assert.strictEqual(metadata.boolean, true);
      assert.strictEqual(metadata.null, null);
      assert.strictEqual(metadata.undefined, undefined);
    });

    void it('should accept nested objects', () => {
      const metadata: LogMetadataType = { nested: { deep: { value: 123 } } };
      const nested = metadata.nested as Record<string, unknown>;
      const deep = nested.deep as Record<string, unknown>;

      assert.strictEqual(deep.value, 123);
    });

    void it('should accept arrays', () => {
      const metadata: LogMetadataType = {
        tags: [
          'tag1',
          'tag2',
          'tag3'
        ]
      };

      assert.ok(Array.isArray(metadata.tags));
      assert.strictEqual((metadata.tags as unknown[]).length, 3);
    });
  });

  void describe('ConsoleLogger with metadata', () => {
    void it('should include metadata in child loggers', () => {
      const logger = ConsoleLogger.create();
      const metadata: LogMetadataType = {
        requestId: '123',
        userId: '456'
      };

      const child = logger.child(metadata);

      assert.ok(child instanceof ConsoleLogger);
    });

    void it('should merge metadata in nested children', () => {
      const logger = ConsoleLogger.create();

      const child1 = logger.child({ level1: 'value1' });
      const child2 = child1.child({ level2: 'value2' });

      assert.ok(child1 instanceof ConsoleLogger);
      assert.ok(child2 instanceof ConsoleLogger);
    });
  });

  void describe('PinoLogger with metadata', () => {
    void it('should include metadata in child loggers', () => {
      const logger = PinoLogger.create();
      const metadata: LogMetadataType = {
        requestId: '789',
        traceId: 'abc'
      };

      const child = logger.child(metadata);

      assert.ok(child instanceof PinoLogger);
      assert.doesNotThrow(() => {
        child.info(TestFactory.body('test'));
      });
    });

    void it('should support complex metadata structures', () => {
      const logger = PinoLogger.create();
      const metadata: LogMetadataType = {
        context: {
          request: {
            method: 'GET',
            path: '/api/users'
          },
          user: {
            id: 123,
            role: 'admin'
          }
        },
        tags: [
          'api',
          'production'
        ],
        timestamp: Date.now()
      };

      const child = logger.child(metadata);

      assert.ok(child instanceof PinoLogger);
      assert.doesNotThrow(() => {
        child.info(TestFactory.body('complex metadata test'));
      });
    });
  });
});
