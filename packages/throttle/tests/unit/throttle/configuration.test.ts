/**
 * Throttle Configuration Unit Tests
 *
 * Tests for configuration validation and defaults
 */

import {
  doesNotThrow, strictEqual, throws
} from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { ConfigurationError } from '../../../src/errors/ConfigurationError.js';
import { Throttle } from '../../../src/throttle/index.js';

void describe('Configuration', () => {
  void describe('defaults', () => {
    void it('uses default configuration when no config provided', () => {
      const throttle = new Throttle();
      const stats = throttle.getStats();

      strictEqual(stats.concurrencyLimit, 10, 'Should use default limit of 10');
    });

    void it('allows custom concurrencyLimit', () => {
      const throttle = new Throttle({ concurrencyLimit: 5 });
      const stats = throttle.getStats();

      strictEqual(stats.concurrencyLimit, 5, 'Should use specified limit');
    });

    void it('uses default concurrencyLimit when not specified', () => {
      const throttle = new Throttle({});
      const stats = throttle.getStats();

      strictEqual(stats.concurrencyLimit, 10, 'Should use default limit of 10');
    });
  });

  void describe('constructor validation', () => {
    void it('validates concurrencyLimit must be a positive integer', () => {
      throws(() => {
        new Throttle({ concurrencyLimit: 0 });
      }, ConfigurationError);

      throws(() => {
        new Throttle({ concurrencyLimit: -1 });
      }, ConfigurationError);

      throws(() => {
        new Throttle({ concurrencyLimit: 1.5 });
      }, ConfigurationError);

      throws(() => {
        new Throttle({ concurrencyLimit: Number.NaN });
      }, ConfigurationError);
    });

    void it('accepts valid configuration', () => {
      doesNotThrow(() => {
        new Throttle({ concurrencyLimit: 5 });
      });

      doesNotThrow(() => {
        new Throttle();
      });
    });
  });

  void describe('updateConfig validation', () => {
    void it('validates concurrencyLimit in updateConfig', () => {
      const throttle = new Throttle();

      throws(() => {
        throttle.updateConfig({ concurrencyLimit: 0 });
      }, ConfigurationError);

      throws(() => {
        throttle.updateConfig({ concurrencyLimit: 1.5 });
      }, ConfigurationError);
    });

    void it('accepts valid updates', () => {
      const throttle = new Throttle();

      doesNotThrow(() => {
        throttle.updateConfig({ concurrencyLimit: 10 });
      });
    });

    void it('allows partial config updates', () => {
      const throttle = new Throttle({ concurrencyLimit: 5 });

      throttle.updateConfig({ concurrencyLimit: 10 });

      const stats = throttle.getStats();

      strictEqual(stats.concurrencyLimit, 10);
    });
  });
});
