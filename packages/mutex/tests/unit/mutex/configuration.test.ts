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
import {
  describe, it
} from 'node:test';

import {
  configInternal, Mutex
} from '../../../src/mutex/index.js';
import {
  defaultConfig, fullConfig
} from '../../fixtures/constants.js';

void describe('Mutex Configuration Validation', () => {
  void describe('Default Configuration', () => {
    void it('uses defaults when no config provided', () => {
      const mutex = Mutex.create();
      const config = mutex.getConfig();

      strictEqual(config.maxQueueSize, 0);
      strictEqual(config.timeout, 0);
      strictEqual(config.enableCoalescing, false);
    });

    void it('accepts empty config object', () => {
      const mutex = Mutex.create(defaultConfig);
      const config = mutex.getConfig();

      strictEqual(config.maxQueueSize, 0);
      strictEqual(config.timeout, 0);
    });

    void it('works with no configuration limits', async () => {
      const mutex = Mutex.create(defaultConfig);

      const result = await mutex.runExclusive('key1', async () => {
        return 'success';
      });

      strictEqual(result, 'success');
    });
  });

  void describe('Valid Configuration', () => {
    void it('accepts valid full configuration', () => {
      const mutex = Mutex.create(fullConfig);
      const config = mutex.getConfig();

      strictEqual(config.maxQueueSize, 100);
      strictEqual(config.timeout, 5000);
    });

    void it('accepts partial configuration', () => {
      const mutex = Mutex.create({ maxQueueSize: 5 });
      const config = mutex.getConfig();

      strictEqual(config.maxQueueSize, 5);
      strictEqual(config.timeout, 0);
    });

    void it('accepts only maxQueueSize', () => {
      const mutex = Mutex.create({ maxQueueSize: 50 });
      const config = mutex.getConfig();

      strictEqual(config.maxQueueSize, 50);
    });

    void it('accepts only timeout', () => {
      const mutex = Mutex.create({ timeout: 2000 });
      const config = mutex.getConfig();

      strictEqual(config.timeout, 2000);
    });

    void it('accepts enableCoalescing', () => {
      const mutex = Mutex.create({ enableCoalescing: true });
      const config = mutex.getConfig();

      strictEqual(config.enableCoalescing, true);
    });
  });

  void describe('Invalid Configuration', () => {
    void it('rejects negative maxQueueSize', () => {
      throws(
        () => {
          return Mutex.create({ maxQueueSize: -1 });
        },
        (error: Error) => {
          return error.message.includes('maxQueueSize');
        }
      );
    });

    void it('rejects negative timeout', () => {
      throws(
        () => {
          return Mutex.create({ timeout: -100 });
        },
        (error: Error) => {
          return error.message.includes('timeout');
        }
      );
    });

    void it('rejects non-integer maxQueueSize', () => {
      throws(
        () => {
          return Mutex.create({ maxQueueSize: 1.5 });
        },
        (error: Error) => {
          return error.message.includes('maxQueueSize');
        }
      );
    });

    void it('rejects non-integer timeout', () => {
      throws(
        () => {
          return Mutex.create({ timeout: 100.5 });
        },
        (error: Error) => {
          return error.message.includes('timeout');
        }
      );
    });

    void it('rejects non-boolean enableCoalescing', () => {
      throws(
        () => {
          return Mutex.create({ enableCoalescing: 'true' as unknown as boolean });
        },
        (error: Error) => {
          return error.message.includes('enableCoalescing');
        }
      );
    });

    void it('rejects unknown configuration keys', () => {
      throws(
        () => {
          const invalidConfig: Partial<Record<string, unknown>> = { unknownKey: 'value' };

          return Mutex.create(invalidConfig);
        },
        (error: Error) => {
          return error.message.includes('Unknown');
        }
      );
    });
  });

  void describe('configInternal.validateConfig() Function', () => {
    void it('validates and returns config', () => {
      const config = configInternal.validateConfig({ maxQueueSize: 100 });

      strictEqual(config.maxQueueSize, 100);
      strictEqual(config.timeout, 0);
    });

    void it('rejects invalid config', () => {
      throws(
        () => {
          return configInternal.validateConfig({ timeout: -100 });
        },
        (error: Error) => {
          return error.message.includes('timeout');
        }
      );
    });
  });

  void describe('Configuration Immutability', () => {
    void it('returns a copy of configuration', () => {
      const mutex = Mutex.create({ maxQueueSize: 10 });

      const config1 = mutex.getConfig();
      const config2 = mutex.getConfig();

      notStrictEqual(config1, config2);
      deepStrictEqual(config1, config2);
    });

    void it('does not allow external modification', () => {
      const mutex = Mutex.create({
        maxQueueSize: 100,
        timeout: 5000
      });

      const config = mutex.getConfig();

      // Attempt to modify readonly property - TypeScript prevents this at compile time,
      // so we use Object.assign to bypass and verify runtime behavior
      Object.assign(config, { maxQueueSize: 999 });

      const config2 = mutex.getConfig();

      strictEqual(config2.maxQueueSize, 100);
    });
  });
});
