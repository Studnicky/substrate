import type { ClientConfigType } from '../../../src/types/ClientConfigType.js';

import assert from 'node:assert';
import {
  describe, it
} from 'node:test';

import { FetchClient } from '../../../src/modules/FetchClient.js';
import { FetchClientBuilder } from '../../../src/modules/FetchClientBuilder.js';

/**
 * Builds a FetchClientBuilder wired to a capturing factory, returning both
 * the builder and a getter for the config passed to the factory on build()
 */
const createCapturingBuilder = (): {
  builder: FetchClientBuilder;
  getCapturedConfig: () => ClientConfigType | undefined;
} => {
  let capturedConfig: ClientConfigType | undefined;
  const builder = FetchClientBuilder.create((config) => {
    capturedConfig = config;

    return FetchClient.create(config);
  });

  return {
    builder,
    getCapturedConfig: () => capturedConfig
  };
};

void describe('FetchClientBuilder', () => {
  void describe('withOptions', () => {
    void it('should pass per-request default options through to the constructed config', () => {
      const { builder, getCapturedConfig } = createCapturingBuilder();
      const options = {
        cache: 'no-store' as const,
        timeout: 3000
      };

      builder.withOptions(options).build();

      assert.deepStrictEqual(getCapturedConfig()?.options, options);
    });

    void it('should omit options when not set', () => {
      const { builder, getCapturedConfig } = createCapturingBuilder();

      builder.build();

      assert.strictEqual(getCapturedConfig()?.options, undefined);
    });

    void it('should override options when set multiple times', () => {
      const { builder, getCapturedConfig } = createCapturingBuilder();

      builder
        .withOptions({ timeout: 1000 })
        .withOptions({ timeout: 2000 });
      builder.build();

      assert.deepStrictEqual(getCapturedConfig()?.options, { timeout: 2000 });
    });

    void it('should combine with other builder setters', () => {
      const { builder, getCapturedConfig } = createCapturingBuilder();

      builder
        .withBaseURL('https://example.com')
        .withOptions({ headers: { 'X-Default': 'yes' } });
      builder.build();

      const config = getCapturedConfig();

      assert.strictEqual(config?.baseURL, 'https://example.com');
      assert.deepStrictEqual(config?.options, { headers: { 'X-Default': 'yes' } });
    });
  });
});
