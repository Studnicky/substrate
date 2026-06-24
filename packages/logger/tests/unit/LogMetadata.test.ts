import type { LogMetadataType } from '../../src/types/LogMetadataType.js';

import assert from 'node:assert/strict';
import {
  describe,
  it
} from 'node:test';

import { LogLevel } from '../../src/constants/LogLevel.js';
import { Logger } from '../../src/modules/Logger.js';
import { MemoryTransport } from '../../src/transports/MemoryTransport.js';

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

  void describe('Logger with metadata', () => {
    void it('should include metadata in child loggers', () => {
      const logger = Logger.create();
      const metadata: LogMetadataType = {
        requestId: '123',
        userId: '456'
      };

      const child = logger.child(metadata);

      assert.ok(child instanceof Logger);
    });

    void it('should merge metadata in nested children', () => {
      const memory = MemoryTransport.create();
      const logger = Logger.create({
        'level': LogLevel.TRACE,
        'transports': [memory]
      });

      const child1 = logger.child({ level1: 'value1' });
      const child2 = child1.child({ level2: 'value2' });

      child2.info(TestFactory.body('nested metadata'));

      const record = memory.records()[0];

      assert.ok(record);
      assert.strictEqual(record.metadata.level1, 'value1');
      assert.strictEqual(record.metadata.level2, 'value2');
    });

    void it('should support complex metadata structures', () => {
      const memory = MemoryTransport.create();
      const logger = Logger.create({
        'level': LogLevel.TRACE,
        'transports': [memory]
      });
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

      assert.doesNotThrow(() => {
        child.info(TestFactory.body('complex metadata test'));
      });

      assert.strictEqual(memory.records().length, 1);
    });
  });
});
