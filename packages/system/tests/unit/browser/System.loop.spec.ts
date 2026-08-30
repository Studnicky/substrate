import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { SystemInterface } from '../../../src/interfaces/SystemInterface.js';
import { System } from '../../../src/browser/index.js';

void describe('browser System', () => {
  void it('satisfies the portable runtime-facts contract without Node-only data', () => {
    const system: SystemInterface = System;
    const platform = system.platform;

    assert.equal(Number.isInteger(system.cpu.logicalCount), true);
    assert.equal(system.optimalWorkerCount >= 1, true);
    assert.equal(Object.hasOwn(platform, 'nodeVersion'), false);
  });
});
