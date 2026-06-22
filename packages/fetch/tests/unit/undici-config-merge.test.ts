/**
 * Unit tests for pool configuration validation and merging
 */

import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { DefaultDispatcherConfig } from '../../src/constants/DefaultDispatcherConfig.js';
import { FetchClient } from '../../src/modules/FetchClient.js';
import { UndiciDispatcher } from '../../src/modules/UndiciDispatcher.js';

void describe('pool configuration validation and merging', () => {
  void describe('validation', () => {
    void it('should reject invalid connections before creating dispatcher', () => {
      assert.throws(() => {
        UndiciDispatcher.create({ connections: -5 });
      }, /must be at least 1/u);
    });

    void it('should reject unknown keys', () => {
      assert.throws(() => {
        UndiciDispatcher.create({ invalidKey: true } as never);
      }, /not declared in the schema/u);
    });

    void it('should accept valid config', () => {
      assert.doesNotThrow(() => {
        UndiciDispatcher.create({ connections: 20 });
      });
    });

    void it('should reject invalid config via FetchClient', () => {
      assert.throws(() => {
        FetchClient.create({
          dispatcher: {
            connections: -5,
            enabled: true
          }
        });
      }, /must be at least 1/u);
    });

    void it('should reject unknown keys via FetchClient', () => {
      assert.throws(() => {
        FetchClient.create({
          dispatcher: {
            enabled: true,
            invalidKey: true
          } as never
        });
      }, /dispatcher.invalidKey.*not declared in the schema/u);
    });
  });

  void describe('default values', () => {
    void it('should have documented timeout defaults', () => {
      assert.strictEqual(DefaultDispatcherConfig.connectTimeout, 10_000, 'connectTimeout should be 10 seconds');
      assert.strictEqual(DefaultDispatcherConfig.headersTimeout, 30_000, 'headersTimeout should be 30 seconds');
      assert.strictEqual(DefaultDispatcherConfig.bodyTimeout, 30_000, 'bodyTimeout should be 30 seconds');
      assert.strictEqual(DefaultDispatcherConfig.keepAliveTimeout, 4000, 'keepAliveTimeout should be 4 seconds');
      assert.strictEqual(DefaultDispatcherConfig.keepAliveMaxTimeout, 600_000, 'keepAliveMaxTimeout should be 10 minutes');
      assert.strictEqual(DefaultDispatcherConfig.keepAliveTimeoutThreshold, 1000, 'keepAliveTimeoutThreshold should be 1 second');
    });

    void it('should have documented connection defaults', () => {
      assert.strictEqual(DefaultDispatcherConfig.connections, 10, 'connections should be 10');
      assert.strictEqual(DefaultDispatcherConfig.pipelining, 1, 'pipelining should be 1');
      assert.strictEqual(DefaultDispatcherConfig.enabled, false, 'enabled should be false by default');
    });

    void it('should have documented size limit defaults', () => {
      assert.strictEqual(DefaultDispatcherConfig.maxHeaderSize, 16_384, 'maxHeaderSize should be 16 KB');
      assert.strictEqual(DefaultDispatcherConfig.maxResponseSize, -1, 'maxResponseSize should be unlimited');
    });

    void it('should have HTTP/2 disabled by default', () => {
      assert.strictEqual(DefaultDispatcherConfig.allowH2, false);
    });

    void it('should have IPv6 autodetection disabled by default', () => {
      assert.strictEqual(DefaultDispatcherConfig.autoSelectFamily, false);
      assert.strictEqual(DefaultDispatcherConfig.autoSelectFamilyAttemptTimeout, 250);
    });

    void it('should have strict content length enabled by default', () => {
      assert.strictEqual(DefaultDispatcherConfig.strictContentLength, true);
    });
  });

  void describe('dispatcher creation', () => {
    void it('should create dispatcher with empty config', () => {
      const dispatcher = UndiciDispatcher.create({});

      assert.ok(dispatcher instanceof UndiciDispatcher);
    });

    void it('should create dispatcher with all options', () => {
      assert.doesNotThrow(() => {
        UndiciDispatcher.create({
          allowH2: true,
          autoSelectFamily: true,
          autoSelectFamilyAttemptTimeout: 400,
          bodyTimeout: 480_000,
          clientTtl: 90_000,
          connections: 30,
          connectTimeout: 8000,
          headersTimeout: 240_000,
          keepAliveMaxTimeout: 480_000,
          keepAliveTimeout: 45_000,
          keepAliveTimeoutThreshold: 1500,
          localAddress: '172.16.0.1',
          maxConcurrentStreams: 150,
          maxHeaderSize: 24_576,
          maxOrigins: 75,
          maxRequestsPerClient: 500,
          maxResponseSize: 2_097_152,
          pipelining: 2,
          strictContentLength: false
        });
      });
    });

    void it('should expose agent via getAgent()', () => {
      const dispatcher = UndiciDispatcher.create({ connections: 10 });

      assert.ok(dispatcher.getAgent() !== undefined);
    });

    void it('should expose abort signal via getSignal()', () => {
      const dispatcher = UndiciDispatcher.create({});

      assert.ok(dispatcher.getSignal() instanceof AbortSignal);
      assert.strictEqual(dispatcher.getSignal().aborted, false);
    });
  });

  void describe('FetchClient integration', () => {
    void it('should reject zero connections during client construction', () => {
      assert.throws(() => {
        FetchClient.create({
          dispatcher: {
            connections: 0,
            enabled: true
          }
        });
      }, /must be at least 1/u);
    });

    void it('should accept valid pool config during client construction', () => {
      assert.doesNotThrow(() => {
        FetchClient.create({
          dispatcher: {
            connections: 20,
            enabled: false
          }
        });
      });
    });

    void it('should create client without dispatcher when pool disabled', () => {
      const client = FetchClient.create({ dispatcher: { enabled: false } });

      assert.ok(client instanceof FetchClient);
    });
  });
});
