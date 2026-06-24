/**
 * Adaptive Configuration Validation Unit Tests
 *
 * Tests for validating adaptive concurrency configuration
 */

import {
  ok, strictEqual, throws
} from 'node:assert/strict';
import { it } from 'node:test';

import {
  ConfigurationError, Throttle
} from '../../../src/throttle/index.js';

// ── Valid config ──────────────────────────────────────────────────────────────

void it('accepts valid adaptive config with all required fields', () => {
  const throttle = new Throttle({
    adaptive: {
      adjustmentInterval: 1000,
      enabled: true,
      maxConcurrency: 50,
      minConcurrency: 5,
      sampleWindow: 100,
      scaleDownThreshold: 1.5,
      scaleUpThreshold: 0.5,
      stepSize: 2,
      targetLatencyMs: 200
    },
    concurrencyLimit: 10
  });

  const stats = throttle.getStats();

  strictEqual(stats.concurrencyLimit, 10);
  ok(stats.adaptive !== undefined, 'Should have adaptive stats');
  strictEqual(stats.adaptive.enabled, true);
  strictEqual(stats.adaptive.minConcurrency, 5);
  strictEqual(stats.adaptive.maxConcurrency, 50);
  strictEqual(stats.adaptive.targetLatencyMs, 200);
});

void it('accepts adaptive config with only required fields and applies defaults', () => {
  const throttle = new Throttle({
    adaptive: {
      enabled: true,
      targetLatencyMs: 200
    },
    concurrencyLimit: 10
  });

  const stats = throttle.getStats();

  ok(stats.adaptive !== undefined);
  strictEqual(stats.adaptive.minConcurrency, 1, 'Should use default minConcurrency');
  strictEqual(stats.adaptive.maxConcurrency, 100, 'Should use default maxConcurrency');
});

void it('accepts disabled adaptive config without other fields', () => {
  const throttle = new Throttle({
    adaptive: { enabled: false },
    concurrencyLimit: 10
  });

  const stats = throttle.getStats();

  // When disabled, adaptive stats may or may not be present
  if (stats.adaptive !== undefined) {
    strictEqual(stats.adaptive.enabled, false);
  }
});

// ── Structural validation ─────────────────────────────────────────────────────

void it('rejects non-object adaptive config', () => {
  throws(
    () => { return new Throttle({ adaptive: 'invalid' as never }); },
    ConfigurationError
  );
});

void it('rejects missing enabled flag', () => {
  throws(
    () => {
      // @ts-expect-error Testing invalid config - missing enabled
      return new Throttle({ adaptive: { targetLatencyMs: 200 } });
    },
    ConfigurationError
  );
});

void it('rejects non-boolean enabled', () => {
  throws(
    () => {
      // @ts-expect-error Testing invalid config - enabled must be boolean
      return new Throttle({ adaptive: { enabled: 'yes' } });
    },
    ConfigurationError
  );
});

void it('rejects missing targetLatencyMs when enabled', () => {
  // Note: targetLatencyMs is optional in the type but required at runtime when enabled=true
  throws(
    () => { return new Throttle({ adaptive: { enabled: true } }); },
    ConfigurationError
  );
});

// ── targetLatencyMs validation ────────────────────────────────────────────────

const invalidTargetLatencyScenarios: Array<{ description: string; value: number }> = [
  { description: 'zero', value: 0 },
  { description: 'negative', value: -100 },
];

for (const { description, value } of invalidTargetLatencyScenarios) {
  void it(`rejects non-positive targetLatencyMs — ${description}`, () => {
    throws(
      () => { return new Throttle({ adaptive: { enabled: true, targetLatencyMs: value } }); },
      ConfigurationError
    );
  });
}

// ── minConcurrency validation ─────────────────────────────────────────────────

void it('rejects minConcurrency less than 1', () => {
  throws(
    () => {
      return new Throttle({
        adaptive: {
          enabled: true,
          minConcurrency: 0,
          targetLatencyMs: 200
        }
      });
    },
    ConfigurationError
  );
});

void it('rejects non-integer minConcurrency', () => {
  throws(
    () => {
      return new Throttle({
        adaptive: {
          enabled: true,
          minConcurrency: 1.5,
          targetLatencyMs: 200
        }
      });
    },
    ConfigurationError
  );
});

void it('rejects minConcurrency greater than maxConcurrency', () => {
  throws(
    () => {
      return new Throttle({
        adaptive: {
          enabled: true,
          maxConcurrency: 5,
          minConcurrency: 10,
          targetLatencyMs: 200
        }
      });
    },
    ConfigurationError
  );
});

// ── scaleUpThreshold validation ───────────────────────────────────────────────

void it('rejects non-positive scaleUpThreshold', () => {
  throws(
    () => {
      return new Throttle({
        adaptive: {
          enabled: true,
          scaleUpThreshold: 0,
          targetLatencyMs: 200
        }
      });
    },
    ConfigurationError
  );
});

const invalidThresholdScenarios: Array<{ description: string; scaleUpThreshold: number; scaleDownThreshold: number }> = [
  { description: 'equal', scaleUpThreshold: 0.5, scaleDownThreshold: 0.5 },
  { description: 'greater', scaleUpThreshold: 0.7, scaleDownThreshold: 0.5 },
];

for (const { description, scaleUpThreshold, scaleDownThreshold } of invalidThresholdScenarios) {
  void it(`rejects scaleUpThreshold >= scaleDownThreshold — ${description}`, () => {
    throws(
      () => {
        return new Throttle({
          adaptive: {
            enabled: true,
            scaleDownThreshold,
            scaleUpThreshold,
            targetLatencyMs: 200
          }
        });
      },
      ConfigurationError
    );
  });
}

// ── sampleWindow validation ───────────────────────────────────────────────────

void it('rejects sampleWindow less than 10', () => {
  throws(
    () => {
      return new Throttle({
        adaptive: {
          enabled: true,
          sampleWindow: 5,
          targetLatencyMs: 200
        }
      });
    },
    ConfigurationError
  );
});

void it('rejects non-integer sampleWindow', () => {
  throws(
    () => {
      return new Throttle({
        adaptive: {
          enabled: true,
          sampleWindow: 50.5,
          targetLatencyMs: 200
        }
      });
    },
    ConfigurationError
  );
});

// ── adjustmentInterval validation ─────────────────────────────────────────────

void it('rejects adjustmentInterval less than 100', () => {
  throws(
    () => {
      return new Throttle({
        adaptive: {
          adjustmentInterval: 50,
          enabled: true,
          targetLatencyMs: 200
        }
      });
    },
    ConfigurationError
  );
});

void it('rejects non-integer adjustmentInterval', () => {
  throws(
    () => {
      return new Throttle({
        adaptive: {
          adjustmentInterval: 500.5,
          enabled: true,
          targetLatencyMs: 200
        }
      });
    },
    ConfigurationError
  );
});

// ── stepSize validation ───────────────────────────────────────────────────────

void it('rejects stepSize less than 1', () => {
  throws(
    () => {
      return new Throttle({
        adaptive: {
          enabled: true,
          stepSize: 0,
          targetLatencyMs: 200
        }
      });
    },
    ConfigurationError
  );
});

void it('rejects non-integer stepSize', () => {
  throws(
    () => {
      return new Throttle({
        adaptive: {
          enabled: true,
          stepSize: 1.5,
          targetLatencyMs: 200
        }
      });
    },
    ConfigurationError
  );
});

// ── Unknown keys ──────────────────────────────────────────────────────────────

void it('rejects unknown keys in adaptive config', () => {
  throws(
    () => {
      return new Throttle({
        adaptive: {
          enabled: true,
          targetLatencyMs: 200,
          // @ts-expect-error Testing invalid config with unknown key
          unknownKey: 'value'
        }
      });
    },
    ConfigurationError
  );
});

// ── concurrencyLimit vs adaptive bounds ───────────────────────────────────────

void it('rejects concurrencyLimit below minConcurrency', () => {
  throws(
    () => {
      return new Throttle({
        adaptive: {
          enabled: true,
          minConcurrency: 10,
          targetLatencyMs: 200
        },
        concurrencyLimit: 5
      });
    },
    ConfigurationError
  );
});

void it('rejects concurrencyLimit above maxConcurrency', () => {
  throws(
    () => {
      return new Throttle({
        adaptive: {
          enabled: true,
          maxConcurrency: 10,
          targetLatencyMs: 200
        },
        concurrencyLimit: 20
      });
    },
    ConfigurationError
  );
});

// ── Defaults ──────────────────────────────────────────────────────────────────

void it('applies default minConcurrency of 1', () => {
  const throttle = new Throttle({
    adaptive: {
      enabled: true,
      targetLatencyMs: 200
    },
    concurrencyLimit: 10
  });

  const stats = throttle.getStats();

  ok(stats.adaptive !== undefined);
  strictEqual(stats.adaptive.minConcurrency, 1);
});

void it('applies default maxConcurrency of 100', () => {
  const throttle = new Throttle({
    adaptive: {
      enabled: true,
      targetLatencyMs: 200
    },
    concurrencyLimit: 10
  });

  const stats = throttle.getStats();

  ok(stats.adaptive !== undefined);
  strictEqual(stats.adaptive.maxConcurrency, 100);
});
