/**
 * Unit tests for pool configuration validation
 */

import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { validateDispatcher } from '../../src/config/schemas/validateDispatcher.js';

void describe('pool configuration validation', () => {
  void describe('enabled', () => {
    void it('should accept boolean true', () => {
      assert.doesNotThrow(() => {
        validateDispatcher({ enabled: true });
      });
    });

    void it('should accept boolean false', () => {
      assert.doesNotThrow(() => {
        validateDispatcher({ enabled: false });
      });
    });

    void it('should reject non-boolean', () => {
      assert.throws(() => {
        Reflect.apply(validateDispatcher, undefined, [{ enabled: 123 }]);
      }, /must be a boolean/u);
    });
  });

  void describe('connections', () => {
    void it('should accept valid number', () => {
      assert.doesNotThrow(() => {
        validateDispatcher({ connections: 20 });
      });
    });

    void it('should accept null', () => {
      assert.doesNotThrow(() => {
        validateDispatcher({ connections: null });
      });
    });

    void it('should reject zero', () => {
      assert.throws(() => {
        validateDispatcher({ connections: 0 });
      }, /must be at least 1/u);
    });

    void it('should reject negative', () => {
      assert.throws(() => {
        validateDispatcher({ connections: -1 });
      }, /must be at least 1/u);
    });

    void it('should reject exceeding max', () => {
      assert.throws(() => {
        validateDispatcher({ connections: 1001 });
      }, /must not exceed 1000/u);
    });

    void it('should reject non-integer', () => {
      assert.throws(() => {
        validateDispatcher({ connections: 10.5 });
      }, /must be an integer/u);
    });

    void it('should reject non-number', () => {
      assert.throws(() => {
        const invalidConfig = { connections: {} };

        Reflect.apply(validateDispatcher, undefined, [invalidConfig]);
      }, /must be a number/u);
    });
  });

  void describe('pipelining', () => {
    void it('should accept 0 (disabled)', () => {
      assert.doesNotThrow(() => {
        validateDispatcher({ pipelining: 0 });
      });
    });

    void it('should accept valid number', () => {
      assert.doesNotThrow(() => {
        validateDispatcher({ pipelining: 5 });
      });
    });

    void it('should reject negative', () => {
      assert.throws(() => {
        validateDispatcher({ pipelining: -1 });
      }, /must be non-negative/u);
    });

    void it('should reject exceeding max', () => {
      assert.throws(() => {
        validateDispatcher({ pipelining: 11 });
      }, /must not exceed 10/u);
    });

    void it('should reject non-integer', () => {
      assert.throws(() => {
        validateDispatcher({ pipelining: 1.5 });
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
            validateDispatcher({ [timeout]: 5000 });
          });
        });

        void it('should reject negative', () => {
          assert.throws(() => {
            validateDispatcher({ [timeout]: -1 });
          }, /must be non-negative/u);
        });

        void it('should reject infinite', () => {
          assert.throws(() => {
            validateDispatcher({ [timeout]: Number.POSITIVE_INFINITY });
          }, /must be finite/u);
        });

        void it('should reject non-number', () => {
          assert.throws(() => {
            const invalidConfig = { [timeout]: {} };

            validateDispatcher(invalidConfig);
          }, /must be a number/u);
        });
      });
    }
  });

  void describe('HTTP/2 options', () => {
    void it('should accept allowH2 boolean', () => {
      assert.doesNotThrow(() => {
        validateDispatcher({ allowH2: true });
      });
    });

    void it('should reject allowH2 non-boolean', () => {
      assert.throws(() => {
        Reflect.apply(validateDispatcher, undefined, [{ allowH2: 1 }]);
      }, /must be a boolean/u);
    });

    void it('should accept maxConcurrentStreams', () => {
      assert.doesNotThrow(() => {
        validateDispatcher({ maxConcurrentStreams: 50 });
      });
    });

    void it('should reject maxConcurrentStreams < 1', () => {
      assert.throws(() => {
        validateDispatcher({ maxConcurrentStreams: 0 });
      }, /must be at least 1/u);
    });

    void it('should reject maxConcurrentStreams non-integer', () => {
      assert.throws(() => {
        validateDispatcher({ maxConcurrentStreams: 10.5 });
      }, /must be an integer/u);
    });
  });

  void describe('size limits', () => {
    void it('should accept maxResponseSize -1', () => {
      assert.doesNotThrow(() => {
        validateDispatcher({ maxResponseSize: -1 });
      });
    });

    void it('should accept maxResponseSize positive', () => {
      assert.doesNotThrow(() => {
        validateDispatcher({ maxResponseSize: 1024 * 1024 });
      });
    });

    void it('should reject maxResponseSize negative (not -1)', () => {
      assert.throws(() => {
        validateDispatcher({ maxResponseSize: -2 });
      }, /must be -1.*or positive/u);
    });

    void it('should accept maxHeaderSize', () => {
      assert.doesNotThrow(() => {
        validateDispatcher({ maxHeaderSize: 32_768 });
      });
    });

    void it('should reject maxHeaderSize < 1', () => {
      assert.throws(() => {
        validateDispatcher({ maxHeaderSize: 0 });
      }, /must be at least 1/u);
    });
  });

  void describe('connection management', () => {
    void it('should accept maxRequestsPerClient', () => {
      assert.doesNotThrow(() => {
        validateDispatcher({ maxRequestsPerClient: 100 });
      });
    });

    void it('should accept maxRequestsPerClient undefined', () => {
      assert.doesNotThrow(() => {
        validateDispatcher({ maxRequestsPerClient: undefined });
      });
    });

    void it('should reject maxRequestsPerClient < 1', () => {
      assert.throws(() => {
        validateDispatcher({ maxRequestsPerClient: 0 });
      }, /must be at least 1/u);
    });

    void it('should accept clientTtl', () => {
      assert.doesNotThrow(() => {
        validateDispatcher({ clientTtl: 60_000 });
      });
    });

    void it('should accept clientTtl undefined', () => {
      assert.doesNotThrow(() => {
        validateDispatcher({ clientTtl: undefined });
      });
    });

    void it('should reject clientTtl negative', () => {
      assert.throws(() => {
        validateDispatcher({ clientTtl: -1 });
      }, /must be non-negative/u);
    });

    void it('should accept strictContentLength boolean', () => {
      assert.doesNotThrow(() => {
        validateDispatcher({ strictContentLength: false });
      });
    });

    void it('should reject strictContentLength non-boolean', () => {
      assert.throws(() => {
        Reflect.apply(validateDispatcher, undefined, [{ strictContentLength: 0 }]);
      }, /must be a boolean/u);
    });
  });

  void describe('network options', () => {
    void it('should accept localAddress', () => {
      assert.doesNotThrow(() => {
        validateDispatcher({ localAddress: '192.168.1.100' });
      });
    });

    void it('should accept localAddress undefined', () => {
      assert.doesNotThrow(() => {
        validateDispatcher({ localAddress: undefined });
      });
    });

    void it('should reject localAddress empty string', () => {
      assert.throws(() => {
        validateDispatcher({ localAddress: '' });
      }, /must not be empty/u);
    });

    void it('should reject localAddress non-string', () => {
      assert.throws(() => {
        Reflect.apply(validateDispatcher, undefined, [{ localAddress: 123 }]);
      }, /must be a string/u);
    });

    void it('should accept autoSelectFamily boolean', () => {
      assert.doesNotThrow(() => {
        validateDispatcher({ autoSelectFamily: true });
      });
    });

    void it('should reject autoSelectFamily non-boolean', () => {
      assert.throws(() => {
        Reflect.apply(validateDispatcher, undefined, [{ autoSelectFamily: 1 }]);
      }, /must be a boolean/u);
    });

    void it('should accept autoSelectFamilyAttemptTimeout', () => {
      assert.doesNotThrow(() => {
        validateDispatcher({ autoSelectFamilyAttemptTimeout: 500 });
      });
    });

    void it('should reject autoSelectFamilyAttemptTimeout negative', () => {
      assert.throws(() => {
        validateDispatcher({ autoSelectFamilyAttemptTimeout: -1 });
      }, /must be non-negative/u);
    });
  });

  void describe('agent-specific options', () => {
    void it('should accept maxOrigins', () => {
      assert.doesNotThrow(() => {
        validateDispatcher({ maxOrigins: 50 });
      });
    });

    void it('should accept maxOrigins undefined', () => {
      assert.doesNotThrow(() => {
        validateDispatcher({ maxOrigins: undefined });
      });
    });

    void it('should reject maxOrigins < 1', () => {
      assert.throws(() => {
        validateDispatcher({ maxOrigins: 0 });
      }, /must be at least 1/u);
    });

    void it('should reject maxOrigins non-integer', () => {
      assert.throws(() => {
        validateDispatcher({ maxOrigins: 10.5 });
      }, /must be an integer/u);
    });
  });

  void describe('unknown keys', () => {
    void it('should reject unknown configuration key', () => {
      assert.throws(() => {
        Reflect.apply(validateDispatcher, undefined, [{ unknownKey: true }]);
      }, /unknownKey.*not declared in the schema/u);
    });

    void it('should reject typo in key name', () => {
      assert.throws(() => {
        Reflect.apply(validateDispatcher, undefined, [{ conections: 10 }]);
      }, /conections.*not declared in the schema/u);
    });
  });

  void describe('comprehensive config', () => {
    void it('should accept all valid options together', () => {
      assert.doesNotThrow(() => {
        validateDispatcher({
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
