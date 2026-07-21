/** Proves BoundaryKit.create() builds a working composition from plain config. */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BoundaryKit } from '../../../src/index.js';

void describe('BoundaryKit.create() with plain config', () => {
  void it('executes through primitives built from plain config', async () => {
    const kit = BoundaryKit.create({
      'circuitBreaker': { 'failureThreshold': 3, 'resetTimeoutMs': 1000 },
      'retry': { 'maxRetries': 5 },
      'throttle': { 'concurrencyLimit': 4 }
    });

    const result = await kit.execute(async () => 'ok');

    assert.equal(result, 'ok');
  });

  void it('resolves working defaults when config is omitted', async () => {
    const kit = BoundaryKit.create();

    const result = await kit.execute(async () => 'ok');

    assert.equal(result, 'ok');
  });
});
