import assert from 'node:assert/strict';
import {
  describe, test
} from 'node:test';

import { PinoLogger } from '../../src/modules/PinoLogger.js';

void describe('PinoLogger configuration validation', () => {
  void describe('validates before applying defaults', () => {
    void test('should throw ConfigurationError for invalid pretty type', () => {
      assert.throws(
        () => {
          return new PinoLogger({ pretty: 'true' as unknown as boolean });
        },
        {
          message: 'pretty must be a boolean',
          name: 'ConfigurationError'
        }
      );
    });

    void test('should throw ConfigurationError for invalid destination type', () => {
      assert.throws(
        () => {
          return new PinoLogger({ destination: 123 as unknown as string });
        },
        {
          message: 'destination must be a string',
          name: 'ConfigurationError'
        }
      );
    });

    void test('should throw ConfigurationError for invalid metadata type - null', () => {
      assert.throws(
        () => {
          return new PinoLogger({ metadata: null as unknown as Record<string, unknown> });
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
          return new PinoLogger({ metadata: [] as unknown as Record<string, unknown> });
        },
        {
          message: 'metadata must be a plain object',
          name: 'ConfigurationError'
        }
      );
    });

    void test('should throw ConfigurationError for invalid name type', () => {
      assert.throws(
        () => {
          return new PinoLogger({ name: 123 as unknown as string });
        },
        {
          message: 'name must be a string',
          name: 'ConfigurationError'
        }
      );
    });

    void test('should throw ConfigurationError for invalid safe type', () => {
      assert.throws(
        () => {
          return new PinoLogger({ safe: 'true' as unknown as boolean });
        },
        {
          message: 'safe must be a boolean',
          name: 'ConfigurationError'
        }
      );
    });

    void test('should throw ConfigurationError for invalid serializers type', () => {
      assert.throws(
        () => {
          return new PinoLogger({ serializers: [] as unknown as Record<string, (value: unknown) => unknown> });
        },
        {
          message: 'serializers must be a plain object',
          name: 'ConfigurationError'
        }
      );
    });

    void test('should throw ConfigurationError for invalid timestamp type', () => {
      assert.throws(
        () => {
          return new PinoLogger({ timestamp: 'true' as unknown as boolean });
        },
        {
          message: 'timestamp must be a boolean or function',
          name: 'ConfigurationError'
        }
      );
    });

    void test('should throw ConfigurationError for invalid messageKey type', () => {
      assert.throws(
        () => {
          return new PinoLogger({ messageKey: 123 as unknown as string });
        },
        {
          message: 'messageKey must be a string',
          name: 'ConfigurationError'
        }
      );
    });

    void test('should throw ConfigurationError for invalid errorKey type', () => {
      assert.throws(
        () => {
          return new PinoLogger({ errorKey: 123 as unknown as string });
        },
        {
          message: 'errorKey must be a string',
          name: 'ConfigurationError'
        }
      );
    });

    void test('should throw ConfigurationError for invalid nestedKey type', () => {
      assert.throws(
        () => {
          return new PinoLogger({ nestedKey: 123 as unknown as string });
        },
        {
          message: 'nestedKey must be a string',
          name: 'ConfigurationError'
        }
      );
    });

    void test('should throw ConfigurationError for invalid enabled type', () => {
      assert.throws(
        () => {
          return new PinoLogger({ enabled: 'true' as unknown as boolean });
        },
        {
          message: 'enabled must be a boolean',
          name: 'ConfigurationError'
        }
      );
    });

    void test('should throw ConfigurationError for invalid redact type', () => {
      assert.throws(
        () => {
          return new PinoLogger({ redact: 'password' as unknown as string[] });
        },
        {
          message: 'redact must be an array or object',
          name: 'ConfigurationError'
        }
      );
    });

    void test('should throw ConfigurationError for invalid formatters type', () => {
      assert.throws(
        () => {
          return new PinoLogger({ formatters: [] as unknown as object });
        },
        {
          message: 'formatters must be a plain object',
          name: 'ConfigurationError'
        }
      );
    });

    void test('should throw ConfigurationError for invalid mixin type', () => {
      assert.throws(
        () => {
          return new PinoLogger({ mixin: 'test' as unknown as () => object });
        },
        {
          message: 'mixin must be a function',
          name: 'ConfigurationError'
        }
      );
    });

    void test('should accept undefined values and apply defaults', () => {
      const logger = new PinoLogger({
        destination: undefined,
        enabled: undefined,
        errorKey: undefined,
        formatters: undefined,
        level: undefined,
        messageKey: undefined,
        metadata: undefined,
        mixin: undefined,
        name: undefined,
        nestedKey: undefined,
        pretty: undefined,
        redact: undefined,
        safe: undefined,
        serializers: undefined,
        timestamp: undefined
      });

      assert.ok(logger instanceof PinoLogger);
    });

    void test('should apply defaults when config values are undefined', () => {
      const logger = new PinoLogger({ pretty: undefined });

      assert.ok(logger instanceof PinoLogger);
    });

    void test('should accept valid boolean timestamp', () => {
      const logger = new PinoLogger({ timestamp: true });

      assert.ok(logger instanceof PinoLogger);
    });

    void test('should accept valid function timestamp', () => {
      const logger = new PinoLogger({
        timestamp: () => {
          return `,"time":"${Date.now()}"`;
        }
      });

      assert.ok(logger instanceof PinoLogger);
    });

    void test('should accept valid redact array', () => {
      const logger = new PinoLogger({
        redact: [
          'password',
          'token'
        ]
      });

      assert.ok(logger instanceof PinoLogger);
    });

    void test('should accept valid redact object', () => {
      const logger = new PinoLogger({
        redact: {
          censor: '[REDACTED]',
          paths: [
            'password',
            'token'
          ]
        }
      });

      assert.ok(logger instanceof PinoLogger);
    });

    void test('should accept valid values', () => {
      const logger = new PinoLogger({
        enabled: true,
        level: 'info',
        metadata: { service: 'test' },
        name: 'test-logger',
        pretty: false,
        safe: true
      });

      assert.ok(logger instanceof PinoLogger);
    });
  });
});
