/**
 * Unit tests for pool configuration validation
 */

import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { UndiciDispatcher } from '../../src/modules/UndiciDispatcher.js';

void describe('pool configuration validation', () => {
  void describe('enabled', () => {
    void it('should accept boolean true', () => {
      assert.doesNotThrow(() => {
        UndiciDispatcher.create({ enabled: true });
      });
    });

    void it('should accept boolean false', () => {
      assert.doesNotThrow(() => {
        UndiciDispatcher.create({ enabled: false });
      });
    });

    void it('should reject non-boolean', () => {
      assert.throws(() => {
        UndiciDispatcher.create({ enabled: 123 as never });
      }, /must be a boolean/u);
    });
  });

  void describe('connections', () => {
    void it('should accept valid number', () => {
      assert.doesNotThrow(() => {
        UndiciDispatcher.create({ connections: 20 });
      });
    });

    void it('should accept null', () => {
      assert.doesNotThrow(() => {
        UndiciDispatcher.create({ connections: null });
      });
    });

    void it('should reject zero', () => {
      assert.throws(() => {
        UndiciDispatcher.create({ connections: 0 });
      }, /must be at least 1/u);
    });

    void it('should reject negative', () => {
      assert.throws(() => {
        UndiciDispatcher.create({ connections: -1 });
      }, /must be at least 1/u);
    });

    void it('should reject exceeding max', () => {
      assert.throws(() => {
        UndiciDispatcher.create({ connections: 1001 });
      }, /must not exceed 1000/u);
    });

    void it('should reject non-integer', () => {
      assert.throws(() => {
        UndiciDispatcher.create({ connections: 10.5 });
      }, /must be an integer/u);
    });

    void it('should reject non-number', () => {
      assert.throws(() => {
        const invalidConfig = { connections: {} };

        // @ts-expect-error Testing invalid type
        UndiciDispatcher.create(invalidConfig);
      }, /must be a number/u);
    });
  });

  void describe('pipelining', () => {
    void it('should accept 0 (disabled)', () => {
      assert.doesNotThrow(() => {
        UndiciDispatcher.create({ pipelining: 0 });
      });
    });

    void it('should accept valid number', () => {
      assert.doesNotThrow(() => {
        UndiciDispatcher.create({ pipelining: 5 });
      });
    });

    void it('should reject negative', () => {
      assert.throws(() => {
        UndiciDispatcher.create({ pipelining: -1 });
      }, /must be non-negative/u);
    });

    void it('should reject exceeding max', () => {
      assert.throws(() => {
        UndiciDispatcher.create({ pipelining: 11 });
      }, /must not exceed 10/u);
    });

    void it('should reject non-integer', () => {
      assert.throws(() => {
        UndiciDispatcher.create({ pipelining: 1.5 });
      }, /must be an integer/u);
    });
  });

  void describe('timeout options', () => {
    const timeouts = [
      'connectTimeout',
      'bodyTimeout',
      'headersTimeout',
      'keepAliveTimeout',
      'keepAliveMaxTimeout',
      'keepAliveTimeoutThreshold'
    ];

    for (const timeout of timeouts) {
      void describe(timeout, () => {
        void it('should accept valid number', () => {
          assert.doesNotThrow(() => {
            UndiciDispatcher.create({ [timeout]: 5000 });
          });
        });

        void it('should reject negative', () => {
          assert.throws(() => {
            UndiciDispatcher.create({ [timeout]: -1 });
          }, /must be non-negative/u);
        });

        void it('should reject infinite', () => {
          assert.throws(() => {
            UndiciDispatcher.create({ [timeout]: Number.POSITIVE_INFINITY });
          }, /must be finite/u);
        });

        void it('should reject non-number', () => {
          assert.throws(() => {
            const invalidConfig = { [timeout]: {} };

            UndiciDispatcher.create(invalidConfig);
          }, /must be a number/u);
        });
      });
    }
  });

  void describe('HTTP/2 options', () => {
    void it('should accept allowH2 boolean', () => {
      assert.doesNotThrow(() => {
        UndiciDispatcher.create({ allowH2: true });
      });
    });

    void it('should reject allowH2 non-boolean', () => {
      assert.throws(() => {
        UndiciDispatcher.create({ allowH2: 1 as never });
      }, /must be a boolean/u);
    });

    void it('should accept maxConcurrentStreams', () => {
      assert.doesNotThrow(() => {
        UndiciDispatcher.create({ maxConcurrentStreams: 50 });
      });
    });

    void it('should reject maxConcurrentStreams < 1', () => {
      assert.throws(() => {
        UndiciDispatcher.create({ maxConcurrentStreams: 0 });
      }, /must be at least 1/u);
    });

    void it('should reject maxConcurrentStreams non-integer', () => {
      assert.throws(() => {
        UndiciDispatcher.create({ maxConcurrentStreams: 10.5 });
      }, /must be an integer/u);
    });
  });

  void describe('size limits', () => {
    void it('should accept maxResponseSize -1', () => {
      assert.doesNotThrow(() => {
        UndiciDispatcher.create({ maxResponseSize: -1 });
      });
    });

    void it('should accept maxResponseSize positive', () => {
      assert.doesNotThrow(() => {
        UndiciDispatcher.create({ maxResponseSize: 1024 * 1024 });
      });
    });

    void it('should reject maxResponseSize negative (not -1)', () => {
      assert.throws(() => {
        UndiciDispatcher.create({ maxResponseSize: -2 });
      }, /must be -1.*or positive/u);
    });

    void it('should accept maxHeaderSize', () => {
      assert.doesNotThrow(() => {
        UndiciDispatcher.create({ maxHeaderSize: 32_768 });
      });
    });

    void it('should reject maxHeaderSize < 1', () => {
      assert.throws(() => {
        UndiciDispatcher.create({ maxHeaderSize: 0 });
      }, /must be at least 1/u);
    });
  });

  void describe('connection management', () => {
    void it('should accept maxRequestsPerClient', () => {
      assert.doesNotThrow(() => {
        UndiciDispatcher.create({ maxRequestsPerClient: 100 });
      });
    });

    void it('should accept maxRequestsPerClient undefined', () => {
      assert.doesNotThrow(() => {
        UndiciDispatcher.create({ maxRequestsPerClient: undefined });
      });
    });

    void it('should reject maxRequestsPerClient < 1', () => {
      assert.throws(() => {
        UndiciDispatcher.create({ maxRequestsPerClient: 0 });
      }, /must be at least 1/u);
    });

    void it('should accept clientTtl', () => {
      assert.doesNotThrow(() => {
        UndiciDispatcher.create({ clientTtl: 60_000 });
      });
    });

    void it('should accept clientTtl undefined', () => {
      assert.doesNotThrow(() => {
        UndiciDispatcher.create({ clientTtl: undefined });
      });
    });

    void it('should reject clientTtl negative', () => {
      assert.throws(() => {
        UndiciDispatcher.create({ clientTtl: -1 });
      }, /must be non-negative/u);
    });

    void it('should accept strictContentLength boolean', () => {
      assert.doesNotThrow(() => {
        UndiciDispatcher.create({ strictContentLength: false });
      });
    });

    void it('should reject strictContentLength non-boolean', () => {
      assert.throws(() => {
        UndiciDispatcher.create({ strictContentLength: 0 as never });
      }, /must be a boolean/u);
    });
  });

  void describe('network options', () => {
    void it('should accept localAddress', () => {
      assert.doesNotThrow(() => {
        UndiciDispatcher.create({ localAddress: '192.168.1.100' });
      });
    });

    void it('should accept localAddress undefined', () => {
      assert.doesNotThrow(() => {
        UndiciDispatcher.create({ localAddress: undefined });
      });
    });

    void it('should reject localAddress empty string', () => {
      assert.throws(() => {
        UndiciDispatcher.create({ localAddress: '' });
      }, /must not be empty/u);
    });

    void it('should reject localAddress non-string', () => {
      assert.throws(() => {
        UndiciDispatcher.create({ localAddress: 123 as never });
      }, /must be a string/u);
    });

    void it('should accept autoSelectFamily boolean', () => {
      assert.doesNotThrow(() => {
        UndiciDispatcher.create({ autoSelectFamily: true });
      });
    });

    void it('should reject autoSelectFamily non-boolean', () => {
      assert.throws(() => {
        UndiciDispatcher.create({ autoSelectFamily: 1 as never });
      }, /must be a boolean/u);
    });

    void it('should accept autoSelectFamilyAttemptTimeout', () => {
      assert.doesNotThrow(() => {
        UndiciDispatcher.create({ autoSelectFamilyAttemptTimeout: 500 });
      });
    });

    void it('should reject autoSelectFamilyAttemptTimeout negative', () => {
      assert.throws(() => {
        UndiciDispatcher.create({ autoSelectFamilyAttemptTimeout: -1 });
      }, /must be non-negative/u);
    });
  });

  void describe('agent-specific options', () => {
    void it('should accept maxOrigins', () => {
      assert.doesNotThrow(() => {
        UndiciDispatcher.create({ maxOrigins: 50 });
      });
    });

    void it('should accept maxOrigins undefined', () => {
      assert.doesNotThrow(() => {
        UndiciDispatcher.create({ maxOrigins: undefined });
      });
    });

    void it('should reject maxOrigins < 1', () => {
      assert.throws(() => {
        UndiciDispatcher.create({ maxOrigins: 0 });
      }, /must be at least 1/u);
    });

    void it('should reject maxOrigins non-integer', () => {
      assert.throws(() => {
        UndiciDispatcher.create({ maxOrigins: 10.5 });
      }, /must be an integer/u);
    });
  });

  void describe('unknown keys', () => {
    void it('should reject unknown configuration key', () => {
      assert.throws(() => {
        UndiciDispatcher.create({ unknownKey: true } as never);
      }, /unknownKey.*not declared in the schema/u);
    });

    void it('should reject typo in key name', () => {
      assert.throws(() => {
        UndiciDispatcher.create({ conections: 10 } as never);
      }, /conections.*not declared in the schema/u);
    });
  });

  void describe('comprehensive config', () => {
    void it('should accept all valid options together', () => {
      assert.doesNotThrow(() => {
        UndiciDispatcher.create({
          allowH2: false,
          autoSelectFamily: true,
          autoSelectFamilyAttemptTimeout: 300,
          bodyTimeout: 600_000,
          clientTtl: 120_000,
          connections: 20,
          connectTimeout: 10_000,
          enabled: true,
          headersTimeout: 300_000,
          keepAliveMaxTimeout: 600_000,
          keepAliveTimeout: 60_000,
          keepAliveTimeoutThreshold: 2000,
          localAddress: '192.168.1.100',
          maxConcurrentStreams: 100,
          maxHeaderSize: 32_768,
          maxOrigins: 100,
          maxRequestsPerClient: 1000,
          maxResponseSize: -1,
          pipelining: 1,
          strictContentLength: true
        });
      });
    });
  });
});
