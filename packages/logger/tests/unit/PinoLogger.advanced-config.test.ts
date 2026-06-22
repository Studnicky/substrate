import assert from 'node:assert/strict';
import {
  describe,
  it
} from 'node:test';

import { PinoLogger } from '../../src/index.js';

import { TestFactory } from './TestFactory.js';

void describe('PinoLogger - Advanced Configuration', () => {
  void describe('name option', () => {
    void it('should create logger with name', () => {
      assert.doesNotThrow(() => {
        PinoLogger.create({ name: 'my-application' });
      });
    });

    void it('should create logger with empty name', () => {
      assert.doesNotThrow(() => {
        PinoLogger.create({ name: '' });
      });
    });

    void it('should create logger without name', () => {
      assert.doesNotThrow(() => {
        PinoLogger.create({});
      });
    });

    void it('should support name in builder pattern', () => {
      const logger = PinoLogger.builder()
        .name('test-service')
        .build();

      assert.ok(logger instanceof PinoLogger);
    });
  });

  void describe('safe option', () => {
    void it('should create logger with safe=true', () => {
      assert.doesNotThrow(() => {
        PinoLogger.create({ safe: true });
      });
    });

    void it('should create logger with safe=false', () => {
      assert.doesNotThrow(() => {
        PinoLogger.create({ safe: false });
      });
    });

    void it('should handle circular references when safe=true', () => {
      const logger = PinoLogger.create({ safe: true });

      assert.doesNotThrow(() => {
        logger.info(TestFactory.body('circular test'));
      });
    });

    void it('should support safe in builder pattern', () => {
      const logger = PinoLogger.builder()
        .safe(true)
        .build();

      assert.ok(logger instanceof PinoLogger);
    });
  });

  void describe('serializers option', () => {
    void it('should create logger with custom serializers', () => {
      assert.doesNotThrow(() => {
        PinoLogger.create({
          serializers: {
            user: (value: unknown) => {
              const user = value as { id: string;
                password: string };

              return { id: user.id };
            }
          }
        });
      });
    });

    void it('should create logger with multiple serializers', () => {
      assert.doesNotThrow(() => {
        PinoLogger.create({
          serializers: {
            req: (_value: unknown) => {
              return { method: 'GET' };
            },
            res: (_value: unknown) => {
              return { statusCode: 200 };
            }
          }
        });
      });
    });

    void it('should create logger with empty serializers object', () => {
      assert.doesNotThrow(() => {
        PinoLogger.create({ serializers: {} });
      });
    });

    void it('should support serializers in builder pattern', () => {
      const logger = PinoLogger.builder()
        .serializers({
          err: (_value: unknown) => {
            return { message: 'error' };
          }
        })
        .build();

      assert.ok(logger instanceof PinoLogger);
    });
  });

  void describe('timestamp option', () => {
    void it('should create logger with timestamp=true', () => {
      assert.doesNotThrow(() => {
        PinoLogger.create({ timestamp: true });
      });
    });

    void it('should create logger with timestamp=false', () => {
      assert.doesNotThrow(() => {
        PinoLogger.create({ timestamp: false });
      });
    });

    void it('should create logger with timestamp function', () => {
      assert.doesNotThrow(() => {
        PinoLogger.create({
          timestamp: () => {
            return `,"time":"${Date.now()}"`;
          }
        });
      });
    });

    void it('should support timestamp in builder pattern', () => {
      const logger = PinoLogger.builder()
        .timestamp(true)
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should support timestamp function in builder pattern', () => {
      const logger = PinoLogger.builder()
        .timestamp(() => {
          return `,"time":"${Date.now()}"`;
        })
        .build();

      assert.ok(logger instanceof PinoLogger);
    });
  });

  void describe('messageKey option', () => {
    void it('should create logger with custom messageKey', () => {
      assert.doesNotThrow(() => {
        PinoLogger.create({ messageKey: 'message' });
      });
    });

    void it('should create logger with empty messageKey', () => {
      assert.doesNotThrow(() => {
        PinoLogger.create({ messageKey: '' });
      });
    });

    void it('should support messageKey in builder pattern', () => {
      const logger = PinoLogger.builder()
        .messageKey('log')
        .build();

      assert.ok(logger instanceof PinoLogger);
    });
  });

  void describe('errorKey option', () => {
    void it('should create logger with custom errorKey', () => {
      assert.doesNotThrow(() => {
        PinoLogger.create({ errorKey: 'error' });
      });
    });

    void it('should create logger with empty errorKey', () => {
      assert.doesNotThrow(() => {
        PinoLogger.create({ errorKey: '' });
      });
    });

    void it('should support errorKey in builder pattern', () => {
      const logger = PinoLogger.builder()
        .errorKey('exception')
        .build();

      assert.ok(logger instanceof PinoLogger);
    });
  });

  void describe('nestedKey option', () => {
    void it('should create logger with nestedKey', () => {
      assert.doesNotThrow(() => {
        PinoLogger.create({ nestedKey: 'data' });
      });
    });

    void it('should create logger with empty nestedKey', () => {
      assert.doesNotThrow(() => {
        PinoLogger.create({ nestedKey: '' });
      });
    });

    void it('should support nestedKey in builder pattern', () => {
      const logger = PinoLogger.builder()
        .nestedKey('payload')
        .build();

      assert.ok(logger instanceof PinoLogger);
    });
  });

  void describe('enabled option', () => {
    void it('should create logger with enabled=true', () => {
      assert.doesNotThrow(() => {
        PinoLogger.create({ enabled: true });
      });
    });

    void it('should create logger with enabled=false', () => {
      assert.doesNotThrow(() => {
        PinoLogger.create({ enabled: false });
      });
    });

    void it('should not throw when logging with enabled=false', () => {
      const logger = PinoLogger.create({ enabled: false });

      assert.doesNotThrow(() => {
        logger.info(TestFactory.body('test message'));
        logger.error(TestFactory.body('test error'));
      });
    });

    void it('should support enabled in builder pattern', () => {
      const logger = PinoLogger.builder()
        .enabled(false)
        .build();

      assert.ok(logger instanceof PinoLogger);
    });
  });

  void describe('redact option', () => {
    void it('should create logger with redact paths array', () => {
      assert.doesNotThrow(() => {
        PinoLogger.create({
          redact: [
            'password',
            'creditCard'
          ]
        });
      });
    });

    void it('should create logger with empty redact array', () => {
      assert.doesNotThrow(() => {
        PinoLogger.create({ redact: [] });
      });
    });

    void it('should create logger with redact options object', () => {
      assert.doesNotThrow(() => {
        PinoLogger.create({
          redact: {
            censor: '[REDACTED]',
            paths: [
              'password',
              'apiKey'
            ]
          }
        });
      });
    });

    void it('should create logger with redact remove option', () => {
      assert.doesNotThrow(() => {
        PinoLogger.create({
          redact: {
            paths: ['secret'],
            remove: true
          }
        });
      });
    });

    void it('should not throw when logging with redacted fields', () => {
      const logger = PinoLogger.create({ redact: ['password'] });

      assert.doesNotThrow(() => {
        logger.info(TestFactory.body('user login', {
          password: 'secret123',
          username: 'john'
        }));
      });
    });

    void it('should support redact in builder pattern', () => {
      const logger = PinoLogger.builder()
        .redact([
          'password',
          'token'
        ])
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should support redact options in builder pattern', () => {
      const logger = PinoLogger.builder()
        .redact({
          censor: '***',
          paths: ['apiKey']
        })
        .build();

      assert.ok(logger instanceof PinoLogger);
    });
  });

  void describe('formatters option', () => {
    void it('should create logger with level formatter', () => {
      assert.doesNotThrow(() => {
        PinoLogger.create({
          formatters: {
            level: (label: string, number: number) => {
              return { level: number };
            }
          }
        });
      });
    });

    void it('should create logger with log formatter', () => {
      assert.doesNotThrow(() => {
        PinoLogger.create({
          formatters: {
            log: (object: Record<string, unknown>) => {
              return {
                ...object,
                formatted: true
              };
            }
          }
        });
      });
    });

    void it('should create logger with both formatters', () => {
      assert.doesNotThrow(() => {
        PinoLogger.create({
          formatters: {
            level: (label: string, _number: number) => {
              return { lvl: label };
            },
            log: (object: Record<string, unknown>) => {
              return { ...object };
            }
          }
        });
      });
    });

    void it('should create logger with empty formatters object', () => {
      assert.doesNotThrow(() => {
        PinoLogger.create({ formatters: {} });
      });
    });

    void it('should support formatters in builder pattern', () => {
      const logger = PinoLogger.builder()
        .formatters({
          level: (label: string, _number: number) => {
            return { level: label };
          }
        })
        .build();

      assert.ok(logger instanceof PinoLogger);
    });
  });

  void describe('mixin option', () => {
    void it('should create logger with mixin function', () => {
      assert.doesNotThrow(() => {
        PinoLogger.create({
          mixin: () => {
            return { timestamp: Date.now() };
          }
        });
      });
    });

    void it('should create logger with mixin returning empty object', () => {
      assert.doesNotThrow(() => {
        PinoLogger.create({
          mixin: () => {
            return {};
          }
        });
      });
    });

    void it('should create logger with mixin returning multiple properties', () => {
      assert.doesNotThrow(() => {
        PinoLogger.create({
          mixin: () => {
            return {
              hostname: 'localhost',
              pid: process.pid,
              version: '1.0.0'
            };
          }
        });
      });
    });

    void it('should not throw when logging with mixin', () => {
      const logger = PinoLogger.create({
        mixin: () => {
          return { requestId: '123' };
        }
      });

      assert.doesNotThrow(() => {
        logger.info(TestFactory.body('test with mixin'));
      });
    });

    void it('should support mixin in builder pattern', () => {
      const logger = PinoLogger.builder()
        .mixin(() => {
          return { env: 'test' };
        })
        .build();

      assert.ok(logger instanceof PinoLogger);
    });
  });

  void describe('combined advanced options', () => {
    void it('should create logger with multiple advanced options', () => {
      assert.doesNotThrow(() => {
        PinoLogger.create({
          enabled: true,
          errorKey: 'error',
          messageKey: 'message',
          name: 'combined-test',
          safe: true,
          timestamp: true
        });
      });
    });

    void it('should create logger with all advanced options', () => {
      assert.doesNotThrow(() => {
        PinoLogger.create({
          enabled: true,
          errorKey: 'err',
          formatters: {
            level: (label: string, _number: number) => {
              return { level: label };
            }
          },
          messageKey: 'msg',
          mixin: () => {
            return { pid: process.pid };
          },
          name: 'full-config',
          nestedKey: 'data',
          redact: ['password'],
          safe: true,
          serializers: {
            err: (_value: unknown) => {
              return { message: 'error' };
            }
          },
          timestamp: true
        });
      });
    });

    void it('should support multiple advanced options in builder pattern', () => {
      const logger = PinoLogger.builder()
        .name('builder-test')
        .safe(true)
        .enabled(true)
        .messageKey('message')
        .errorKey('error')
        .timestamp(true)
        .build();

      assert.ok(logger instanceof PinoLogger);
    });

    void it('should support all advanced options in builder pattern', () => {
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

    void it('should not throw when logging with all advanced options', () => {
      const logger = PinoLogger.create({
        enabled: true,
        errorKey: 'error',
        formatters: {
          log: (object: Record<string, unknown>) => {
            return {
              ...object,
              formatted: true
            };
          }
        },
        messageKey: 'message',
        mixin: () => {
          return { timestamp: Date.now() };
        },
        name: 'logging-test',
        nestedKey: 'data',
        redact: ['password'],
        safe: true,
        serializers: {
          user: (_value: unknown) => {
            return { id: 'user-123' };
          }
        },
        timestamp: true
      });

      assert.doesNotThrow(() => {
        logger.info(TestFactory.body('test message'));
        logger.error(TestFactory.fault(new Error('test')));
        logger.warn(TestFactory.body('test warning', { password: 'secret' }));
      });
    });
  });

  void describe('edge cases', () => {
    void it('should handle undefined values gracefully', () => {
      assert.doesNotThrow(() => {
        PinoLogger.create({
          enabled: undefined,
          name: undefined,
          safe: undefined
        });
      });
    });

    void it('should handle mixing basic and advanced options', () => {
      assert.doesNotThrow(() => {
        PinoLogger.create({
          level: 'info',
          metadata: { service: 'api' },
          name: 'my-service',
          pretty: false,
          safe: true
        });
      });
    });

    void it('should support advanced options with child loggers', () => {
      const logger = PinoLogger.create({
        name: 'parent',
        safe: true
      });
      const child = logger.child({ requestId: '123' });

      assert.ok(child instanceof PinoLogger);
      assert.doesNotThrow(() => {
        child.info(TestFactory.body('child message'));
      });
    });

    void it('should handle nested child loggers with advanced options', () => {
      const logger = PinoLogger.create({
        mixin: () => {
          return { env: 'test' };
        },
        name: 'root'
      });
      const child1 = logger.child({ level1: 'value1' });
      const child2 = child1.child({ level2: 'value2' });

      assert.doesNotThrow(() => {
        child2.info(TestFactory.body('nested child message'));
      });
    });
  });
});
