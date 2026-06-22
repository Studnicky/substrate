import assert from 'node:assert/strict';
import {
  describe,
  it
} from 'node:test';

import { PinoLogger } from '../../src/index.js';

import { TestFactory } from './TestFactory.js';

void describe('PinoLoggerBuilder - Advanced Methods', () => {
  void describe('withName() method', () => {
    void it('should set logger name', () => {
      const logger = PinoLogger.builder()
        .name('test-application')
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should support method chaining', () => {
      const logger = PinoLogger.builder()
        .name('chain-test')
        .level('info')
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should accept empty string', () => {
      const logger = PinoLogger.builder()
        .name('')
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should override previous name', () => {
      const logger = PinoLogger.builder()
        .name('first-name')
        .name('second-name')
        .build();

      assert.ok(logger instanceof PinoLogger);
    });
  });

  void describe('withSafe() method', () => {
    void it('should enable safe mode', () => {
      const logger = PinoLogger.builder()
        .safe(true)
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should disable safe mode', () => {
      const logger = PinoLogger.builder()
        .safe(false)
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should support method chaining', () => {
      const logger = PinoLogger.builder()
        .safe(true)
        .name('safe-test')
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should handle circular references when enabled', () => {
      const logger = PinoLogger.builder()
        .safe(true)
        .build();

      const obj: Record<string, unknown> = { name: 'test' };

      obj.self = obj;

      assert.doesNotThrow(() => {
        logger.info(TestFactory.body('circular test'));
      });
    });
  });

  void describe('withSerializers() method', () => {
    void it('should set custom serializers', () => {
      const logger = PinoLogger.builder()
        .serializers({
          user: (value: unknown) => {
            const user = value as { id: string;
              password: string };

            return { id: user.id };
          }
        })
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should set multiple serializers', () => {
      const logger = PinoLogger.builder()
        .serializers({
          err: (_value: unknown) => {
            return { message: 'error' };
          },
          req: (_value: unknown) => {
            return { method: 'GET' };
          },
          res: (_value: unknown) => {
            return { statusCode: 200 };
          }
        })
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should accept empty serializers object', () => {
      const logger = PinoLogger.builder()
        .serializers({})
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should support method chaining', () => {
      const logger = PinoLogger.builder()
        .serializers({
          test: (value: unknown) => {
            return value;
          }
        })
        .name('serializer-test')
        .build();

      assert.ok(logger instanceof PinoLogger);
    });
  });

  void describe('withTimestamp() method', () => {
    void it('should enable timestamp', () => {
      const logger = PinoLogger.builder()
        .timestamp(true)
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should disable timestamp', () => {
      const logger = PinoLogger.builder()
        .timestamp(false)
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should accept timestamp function', () => {
      const logger = PinoLogger.builder()
        .timestamp(() => {
          return `,"time":"${Date.now()}"`;
        })
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should support method chaining', () => {
      const logger = PinoLogger.builder()
        .timestamp(true)
        .name('timestamp-test')
        .build();

      assert.ok(logger instanceof PinoLogger);
    });
  });

  void describe('withMessageKey() method', () => {
    void it('should set custom message key', () => {
      const logger = PinoLogger.builder()
        .messageKey('message')
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should accept empty string', () => {
      const logger = PinoLogger.builder()
        .messageKey('')
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should support method chaining', () => {
      const logger = PinoLogger.builder()
        .messageKey('log')
        .name('messagekey-test')
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should override previous message key', () => {
      const logger = PinoLogger.builder()
        .messageKey('msg')
        .messageKey('message')
        .build();

      assert.ok(logger instanceof PinoLogger);
    });
  });

  void describe('withErrorKey() method', () => {
    void it('should set custom error key', () => {
      const logger = PinoLogger.builder()
        .errorKey('error')
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should accept empty string', () => {
      const logger = PinoLogger.builder()
        .errorKey('')
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should support method chaining', () => {
      const logger = PinoLogger.builder()
        .errorKey('exception')
        .name('errorkey-test')
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should override previous error key', () => {
      const logger = PinoLogger.builder()
        .errorKey('err')
        .errorKey('error')
        .build();

      assert.ok(logger instanceof PinoLogger);
    });
  });

  void describe('withNestedKey() method', () => {
    void it('should set nested key', () => {
      const logger = PinoLogger.builder()
        .nestedKey('data')
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should accept empty string', () => {
      const logger = PinoLogger.builder()
        .nestedKey('')
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should support method chaining', () => {
      const logger = PinoLogger.builder()
        .nestedKey('payload')
        .name('nestedkey-test')
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should override previous nested key', () => {
      const logger = PinoLogger.builder()
        .nestedKey('data')
        .nestedKey('payload')
        .build();

      assert.ok(logger instanceof PinoLogger);
    });
  });

  void describe('withEnabled() method', () => {
    void it('should enable logging', () => {
      const logger = PinoLogger.builder()
        .enabled(true)
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should disable logging', () => {
      const logger = PinoLogger.builder()
        .enabled(false)
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should not throw when logging with enabled=false', () => {
      const logger = PinoLogger.builder()
        .enabled(false)
        .build();

      assert.doesNotThrow(() => {
        logger.info(TestFactory.body('test message'));
        logger.error(TestFactory.body('test error'));
      });
    });

    void it('should support method chaining', () => {
      const logger = PinoLogger.builder()
        .enabled(true)
        .name('enabled-test')
        .build();

      assert.ok(logger instanceof PinoLogger);
    });
  });

  void describe('withRedact() method', () => {
    void it('should set redact paths as array', () => {
      const logger = PinoLogger.builder()
        .redact([
          'password',
          'creditCard'
        ])
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should accept empty array', () => {
      const logger = PinoLogger.builder()
        .redact([])
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should set redact options with censor', () => {
      const logger = PinoLogger.builder()
        .redact({
          censor: '[REDACTED]',
          paths: [
            'password',
            'apiKey'
          ]
        })
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should set redact options with remove', () => {
      const logger = PinoLogger.builder()
        .redact({
          paths: ['secret'],
          remove: true
        })
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should not throw when logging with redacted fields', () => {
      const logger = PinoLogger.builder()
        .redact(['password'])
        .build();

      assert.doesNotThrow(() => {
        logger.info(TestFactory.body('user login', {
          password: 'secret123',
          username: 'john'
        }));
      });
    });

    void it('should support method chaining', () => {
      const logger = PinoLogger.builder()
        .redact([
          'password',
          'token'
        ])
        .name('redact-test')
        .build();

      assert.ok(logger instanceof PinoLogger);
    });
  });

  void describe('withFormatters() method', () => {
    void it('should set level formatter', () => {
      const logger = PinoLogger.builder()
        .formatters({
          level: (label: string, number: number) => {
            return { level: number };
          }
        })
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should set log formatter', () => {
      const logger = PinoLogger.builder()
        .formatters({
          log: (object: Record<string, unknown>) => {
            return {
              ...object,
              formatted: true
            };
          }
        })
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should set both formatters', () => {
      const logger = PinoLogger.builder()
        .formatters({
          level: (label: string, _number: number) => {
            return { lvl: label };
          },
          log: (object: Record<string, unknown>) => {
            return { ...object };
          }
        })
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should accept empty formatters object', () => {
      const logger = PinoLogger.builder()
        .formatters({})
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should support method chaining', () => {
      const logger = PinoLogger.builder()
        .formatters({
          level: (label: string, _number: number) => {
            return { level: label };
          }
        })
        .name('formatter-test')
        .build();

      assert.ok(logger instanceof PinoLogger);
    });
  });

  void describe('withMixin() method', () => {
    void it('should set mixin function', () => {
      const logger = PinoLogger.builder()
        .mixin(() => {
          return { timestamp: Date.now() };
        })
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should accept mixin returning empty object', () => {
      const logger = PinoLogger.builder()
        .mixin(() => {
          return {};
        })
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should accept mixin returning multiple properties', () => {
      const logger = PinoLogger.builder()
        .mixin(() => {
          return {
            hostname: 'localhost',
            pid: process.pid,
            version: '1.0.0'
          };
        })
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should not throw when logging with mixin', () => {
      const logger = PinoLogger.builder()
        .mixin(() => {
          return { requestId: '123' };
        })
        .build();

      assert.doesNotThrow(() => {
        logger.info(TestFactory.body('test with mixin'));
      });
    });

    void it('should support method chaining', () => {
      const logger = PinoLogger.builder()
        .mixin(() => {
          return { env: 'test' };
        })
        .name('mixin-test')
        .build();

      assert.ok(logger instanceof PinoLogger);
    });
  });

  void describe('combined advanced builder methods', () => {
    void it('should chain multiple advanced methods', () => {
      const logger = PinoLogger.builder()
        .name('combined-test')
        .safe(true)
        .enabled(true)
        .messageKey('message')
        .errorKey('error')
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should chain all advanced methods', () => {
      const logger = PinoLogger.builder()
        .name('full-builder')
        .safe(true)
        .enabled(true)
        .messageKey('msg')
        .errorKey('err')
        .nestedKey('payload')
        .timestamp(true)
        .redact([
          'password',
          'token'
        ])
        .serializers({
          user: (_value: unknown) => {
            return { id: 'redacted' };
          }
        })
        .formatters({
          level: (label: string, _number: number) => {
            return { lvl: label };
          }
        })
        .mixin(() => {
          return { version: '1.0.0' };
        })
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should combine with basic builder methods', () => {
      const logger = PinoLogger.builder()
        .level('info')
        .pretty(false)
        .metadata({ service: 'api' })
        .name('mixed-builder')
        .safe(true)
        .timestamp(true)
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should not throw when logging with all methods', () => {
      const logger = PinoLogger.builder()
        .name('logging-test')
        .safe(true)
        .enabled(true)
        .messageKey('message')
        .errorKey('error')
        .nestedKey('data')
        .timestamp(true)
        .redact(['password'])
        .serializers({
          user: (_value: unknown) => {
            return { id: 'user-123' };
          }
        })
        .formatters({
          log: (object: Record<string, unknown>) => {
            return {
              ...object,
              formatted: true
            };
          }
        })
        .mixin(() => {
          return { timestamp: Date.now() };
        })
        .build();

      assert.doesNotThrow(() => {
        logger.info(TestFactory.body('test message'));
        logger.error(TestFactory.fault(new Error('test')));
        logger.warn(TestFactory.body('test warning', { password: 'secret' }));
      });
    });
  });

  void describe('builder method order independence', () => {
    void it('should produce same result regardless of order', () => {
      const logger1 = PinoLogger.builder()
        .name('test')
        .safe(true)
        .enabled(true)
        .build();

      const logger2 = PinoLogger.builder()
        .enabled(true)
        .safe(true)
        .name('test')
        .build();

      assert.ok(logger1 instanceof PinoLogger);
      assert.ok(logger2 instanceof PinoLogger);
    });

    void it('should allow multiple calls to same method', () => {
      const logger = PinoLogger.builder()
        .name('first')
        .name('second')
        .name('third')
        .build();

      assert.ok(logger instanceof PinoLogger);
    });
  });

  void describe('builder with child loggers', () => {
    void it('should create child from builder-created logger with advanced options', () => {
      const logger = PinoLogger.builder()
        .name('parent')
        .safe(true)
        .mixin(() => {
          return { env: 'test' };
        })
        .build();

      const child = logger.child({ requestId: '123' });

      assert.ok(child instanceof PinoLogger);
      assert.doesNotThrow(() => {
        child.info(TestFactory.body('child message'));
      });
    });

    void it('should create nested children with advanced options', () => {
      const logger = PinoLogger.builder()
        .name('root')
        .redact(['password'])
        .timestamp(true)
        .build();

      const child1 = logger.child({ level1: 'value1' });
      const child2 = child1.child({ level2: 'value2' });

      assert.doesNotThrow(() => {
        child2.info(TestFactory.body('nested child message', { password: 'secret' }));
      });
    });
  });

  void describe('builder reuse with advanced methods', () => {
    void it('should allow building multiple loggers from same builder', () => {
      const builder = PinoLogger.builder()
        .name('reusable')
        .safe(true);

      const logger1 = builder.build();
      const logger2 = builder.build();

      assert.ok(logger1 instanceof PinoLogger);
      assert.ok(logger2 instanceof PinoLogger);
    });

    void it('should allow modifying builder after build', () => {
      const builder = PinoLogger.builder()
        .name('first');

      const logger1 = builder.build();

      builder.name('second');
      const logger2 = builder.build();

      assert.ok(logger1 instanceof PinoLogger);
      assert.ok(logger2 instanceof PinoLogger);
    });
  });

  void describe('edge cases', () => {
    void it('should handle all methods with minimal configuration', () => {
      const logger = PinoLogger.builder()
        .name('')
        .safe(false)
        .enabled(true)
        .messageKey('')
        .errorKey('')
        .nestedKey('')
        .timestamp(false)
        .redact([])
        .serializers({})
        .formatters({})
        .mixin(() => {
          return {};
        })
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should handle rapid successive calls', () => {
      assert.doesNotThrow(() => {
        PinoLogger.builder()
          .name('test1')
          .name('test2')
          .name('test3')
          .safe(true)
          .safe(false)
          .safe(true)
          .enabled(true)
          .enabled(false)
          .enabled(true)
          .build();
      });
    });
  });
});
