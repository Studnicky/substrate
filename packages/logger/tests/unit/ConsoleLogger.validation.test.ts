import assert from 'node:assert/strict';
import {
  describe, test
} from 'node:test';

import { ConsoleLogger } from '../../src/modules/ConsoleLogger.js';

void describe('ConsoleLogger configuration validation', () => {
  void describe('validates before applying defaults', () => {
    void test('should throw ConfigurationError for invalid prefix type', () => {
      assert.throws(
        () => {
          return new ConsoleLogger({ prefix: 123 as unknown as string });
        },
        {
          message: 'prefix must be a string',
          name: 'ConfigurationError'
        }
      );
    });

    void test('should throw ConfigurationError for invalid includeTimestamp type', () => {
      assert.throws(
        () => {
          return new ConsoleLogger({ includeTimestamp: 'true' as unknown as boolean });
        },
        {
          message: 'includeTimestamp must be a boolean',
          name: 'ConfigurationError'
        }
      );
    });

    void test('should throw ConfigurationError for invalid metadata type - null', () => {
      assert.throws(
        () => {
          return new ConsoleLogger({ metadata: null as unknown as Record<string, unknown> });
        },
        {
          message: 'metadata must be a plain object',
          name: 'ConfigurationError'
        }
      );
    });

    void test('should throw ConfigurationError for invalid metadata type - array', () => {
      assert.throws(
        () => {
          return new ConsoleLogger({ metadata: [] as unknown as Record<string, unknown> });
        },
        {
          message: 'metadata must be a plain object',
          name: 'ConfigurationError'
        }
      );
    });

    void test('should throw ConfigurationError for invalid metadata type - string', () => {
      assert.throws(
        () => {
          return new ConsoleLogger({ metadata: 'test' as unknown as Record<string, unknown> });
        },
        {
          message: 'metadata must be a plain object',
          name: 'ConfigurationError'
        }
      );
    });

    void test('should accept undefined values and apply defaults', () => {
      const logger = new ConsoleLogger({
        includeTimestamp: undefined,
        level: undefined,
        metadata: undefined,
        prefix: undefined
      });

      assert.ok(logger instanceof ConsoleLogger);
    });

    void test('should apply defaults when config values are undefined', () => {
      const logger = new ConsoleLogger({ prefix: undefined });

      assert.ok(logger instanceof ConsoleLogger);
    });

    void test('should accept valid values', () => {
      const logger = new ConsoleLogger({
        includeTimestamp: true,
        level: 'info',
        metadata: { service: 'test' },
        prefix: '[App]'
      });

      assert.ok(logger instanceof ConsoleLogger);
    });
  });
});
