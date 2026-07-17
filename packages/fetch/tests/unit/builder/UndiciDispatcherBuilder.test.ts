import type { DispatcherConfigEntity } from '../../../src/entities/DispatcherConfigEntity.js';

import assert from 'node:assert';
import {
  describe, it
} from 'node:test';

import { UndiciDispatcher } from '../../../src/modules/UndiciDispatcher.js';
import { UndiciDispatcherBuilder } from '../../../src/modules/UndiciDispatcherBuilder.js';

/**
 * Builds an UndiciDispatcherBuilder wired to a capturing factory, returning both
 * the builder and a getter for the config passed to the factory on build()
 */
const createCapturingBuilder = (): {
  builder: UndiciDispatcherBuilder;
  getCapturedConfig: () => DispatcherConfigEntity.Type | undefined;
} => {
  let capturedConfig: DispatcherConfigEntity.Type | undefined;
  const builder = UndiciDispatcherBuilder.create((config) => {
    capturedConfig = config;

    return UndiciDispatcher.create(config);
  });

  return {
    builder,
    getCapturedConfig: () => capturedConfig
  };
};

void describe('UndiciDispatcherBuilder', () => {
  void describe('newly exposed setters', () => {
    void it('should set autoSelectFamily', async () => {
      const { builder, getCapturedConfig } = createCapturingBuilder();
      const dispatcher = builder.withAutoSelectFamily(true).build();

      assert.strictEqual(getCapturedConfig()?.autoSelectFamily, true);
      await dispatcher.destroy();
    });

    void it('should set autoSelectFamilyAttemptTimeout', async () => {
      const { builder, getCapturedConfig } = createCapturingBuilder();
      const dispatcher = builder.withAutoSelectFamilyAttemptTimeout(250).build();

      assert.strictEqual(getCapturedConfig()?.autoSelectFamilyAttemptTimeout, 250);
      await dispatcher.destroy();
    });

    void it('should set clientTtl', async () => {
      const { builder, getCapturedConfig } = createCapturingBuilder();
      const dispatcher = builder.withClientTtl(60_000).build();

      assert.strictEqual(getCapturedConfig()?.clientTtl, 60_000);
      await dispatcher.destroy();
    });

    void it('should set keepAliveMaxTimeout', async () => {
      const { builder, getCapturedConfig } = createCapturingBuilder();
      const dispatcher = builder.withKeepAliveMaxTimeout(600_000).build();

      assert.strictEqual(getCapturedConfig()?.keepAliveMaxTimeout, 600_000);
      await dispatcher.destroy();
    });

    void it('should set keepAliveTimeoutThreshold', async () => {
      const { builder, getCapturedConfig } = createCapturingBuilder();
      const dispatcher = builder.withKeepAliveTimeoutThreshold(2000).build();

      assert.strictEqual(getCapturedConfig()?.keepAliveTimeoutThreshold, 2000);
      await dispatcher.destroy();
    });

    void it('should set maxHeaderSize', async () => {
      const { builder, getCapturedConfig } = createCapturingBuilder();
      const dispatcher = builder.withMaxHeaderSize(16_384).build();

      assert.strictEqual(getCapturedConfig()?.maxHeaderSize, 16_384);
      await dispatcher.destroy();
    });

    void it('should set maxOrigins', async () => {
      const { builder, getCapturedConfig } = createCapturingBuilder();
      const dispatcher = builder.withMaxOrigins(128).build();

      assert.strictEqual(getCapturedConfig()?.maxOrigins, 128);
      await dispatcher.destroy();
    });

    void it('should set maxRequestsPerClient', async () => {
      const { builder, getCapturedConfig } = createCapturingBuilder();
      const dispatcher = builder.withMaxRequestsPerClient(500).build();

      assert.strictEqual(getCapturedConfig()?.maxRequestsPerClient, 500);
      await dispatcher.destroy();
    });

    void it('should set strictContentLength', async () => {
      const { builder, getCapturedConfig } = createCapturingBuilder();
      const dispatcher = builder.withStrictContentLength(true).build();

      assert.strictEqual(getCapturedConfig()?.strictContentLength, true);
      await dispatcher.destroy();
    });

    void it('should combine multiple new setters with existing ones', async () => {
      const { builder, getCapturedConfig } = createCapturingBuilder();
      const dispatcher = builder
        .withConnections(20)
        .withAutoSelectFamily(true)
        .withMaxOrigins(64)
        .withStrictContentLength(false)
        .build();

      const config = getCapturedConfig();

      assert.strictEqual(config?.connections, 20);
      assert.strictEqual(config?.autoSelectFamily, true);
      assert.strictEqual(config?.maxOrigins, 64);
      assert.strictEqual(config?.strictContentLength, false);
      await dispatcher.destroy();
    });
  });
});
