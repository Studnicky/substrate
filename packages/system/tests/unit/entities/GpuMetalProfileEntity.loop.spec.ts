import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { GpuMetalProfileEntity } from '../../../src/entities/GpuMetalProfileEntity.js';

void describe('GpuMetalProfileEntity.create', () => {
  void it('accepts a plain unbranded literal for the minItems-constrained array property and validates', () => {
    const result = GpuMetalProfileEntity.create({
      SPDisplaysDataType: [{ spdisplays_vram: 1, sppci_model: 'Apple M1' }]
    });
    assert.deepEqual(result.SPDisplaysDataType, [{ spdisplays_vram: 1, sppci_model: 'Apple M1' }]);
    assert.equal(GpuMetalProfileEntity.validate(result), true);
  });
});
