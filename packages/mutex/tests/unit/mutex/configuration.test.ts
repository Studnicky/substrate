/**
 * Mutex Configuration Unit Tests
 *
 * Tests configuration validation:
 * - Default configuration
 * - Validation of invalid values
 * - Partial configuration
 * - Configuration immutability
 */

import {
  deepStrictEqual, notStrictEqual, strictEqual, throws
} from 'node:assert/strict';
import { it } from 'node:test';

import {
  configInternal, Mutex
} from '../../../src/mutex/index.js';
import {
  defaultConfig, fullConfig
} from '../../fixtures/constants.js';

// --- Default configuration ---

it('uses defaults when no config provided', () => {
  const mutex = Mutex.create();
  const config = mutex.getConfig();

  strictEqual(config.maxQueueSize, 0);
  strictEqual(config.timeout, 0);
  strictEqual(config.enableCoalescing, false);
});

it('accepts empty config object', () => {
  const mutex = Mutex.create(defaultConfig);
  const config = mutex.getConfig();

  strictEqual(config.maxQueueSize, 0);
  strictEqual(config.timeout, 0);
});

it('works with no configuration limits', async () => {
  const mutex = Mutex.create(defaultConfig);
  const result = await mutex.runExclusive('key1', async () => 'success');

  strictEqual(result, 'success');
});

it('accepts valid full configuration', () => {
  const mutex = Mutex.create(fullConfig);
  const config = mutex.getConfig();

  strictEqual(config.maxQueueSize, 100);
  strictEqual(config.timeout, 5000);
});

// --- Valid partial configs ---

const validPartialConfigs: Array<{
  description: string;
  config: Parameters<typeof Mutex.create>[0];
  expectedMaxQueueSize: number;
  expectedTimeout: number;
}> = [
  {
    description: 'accepts partial configuration with only maxQueueSize',
    config: { maxQueueSize: 5 },
    expectedMaxQueueSize: 5,
    expectedTimeout: 0
  },
  {
    description: 'accepts only maxQueueSize = 50',
    config: { maxQueueSize: 50 },
    expectedMaxQueueSize: 50,
    expectedTimeout: 0
  },
  {
    description: 'accepts only timeout',
    config: { timeout: 2000 },
    expectedMaxQueueSize: 0,
    expectedTimeout: 2000
  }
];

for (const { description, config, expectedMaxQueueSize, expectedTimeout } of validPartialConfigs) {
  it(description, () => {
    const mutex = Mutex.create(config);
    const resolved = mutex.getConfig();

    strictEqual(resolved.maxQueueSize, expectedMaxQueueSize);
    strictEqual(resolved.timeout, expectedTimeout);
  });
}

it('accepts enableCoalescing', () => {
  const mutex = Mutex.create({ enableCoalescing: true });
  const config = mutex.getConfig();

  strictEqual(config.enableCoalescing, true);
});

// --- Invalid configs ---

const invalidConfigs: Array<{
  description: string;
  config: Parameters<typeof Mutex.create>[0];
  messagePattern: string;
}> = [
  {
    description: 'rejects negative maxQueueSize',
    config: { maxQueueSize: -1 },
    messagePattern: 'maxQueueSize'
  },
  {
    description: 'rejects negative timeout',
    config: { timeout: -100 },
    messagePattern: 'timeout'
  },
  {
    description: 'rejects non-integer maxQueueSize',
    config: { maxQueueSize: 1.5 },
    messagePattern: 'maxQueueSize'
  },
  {
    description: 'rejects non-integer timeout',
    config: { timeout: 100.5 },
    messagePattern: 'timeout'
  },
  {
    description: 'rejects non-boolean enableCoalescing',
    config: { enableCoalescing: 'true' as unknown as boolean },
    messagePattern: 'enableCoalescing'
  }
];

for (const { description, config, messagePattern } of invalidConfigs) {
  it(description, () => {
    throws(
      () => { Mutex.create(config); },
      (error: Error) => error.message.includes(messagePattern)
    );
  });
}

it('rejects unknown configuration keys', () => {
  throws(
    () => {
      const invalidConfig: Partial<Record<string, unknown>> = { unknownKey: 'value' };

      Mutex.create(invalidConfig);
    },
    (error: Error) => error.message.includes('Unknown')
  );
});

// --- configInternal.validateConfig ---

it('validateConfig validates and returns config', () => {
  const config = configInternal.validateConfig({ maxQueueSize: 100 });

  strictEqual(config.maxQueueSize, 100);
  strictEqual(config.timeout, 0);
});

it('validateConfig rejects invalid config', () => {
  throws(
    () => { configInternal.validateConfig({ timeout: -100 }); },
    (error: Error) => error.message.includes('timeout')
  );
});

// --- Configuration immutability ---

it('returns a copy of configuration', () => {
  const mutex = Mutex.create({ maxQueueSize: 10 });
  const config1 = mutex.getConfig();
  const config2 = mutex.getConfig();

  notStrictEqual(config1, config2);
  deepStrictEqual(config1, config2);
});

it('does not allow external modification', () => {
  const mutex = Mutex.create({ maxQueueSize: 100, timeout: 5000 });
  const config = mutex.getConfig();

  // Attempt to modify readonly property — TypeScript prevents this at compile
  // time so we use Object.assign to bypass and verify runtime behaviour.
  Object.assign(config, { maxQueueSize: 999 });

  const config2 = mutex.getConfig();

  strictEqual(config2.maxQueueSize, 100);
});
