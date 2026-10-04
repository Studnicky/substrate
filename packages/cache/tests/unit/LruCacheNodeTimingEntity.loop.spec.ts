import assert from 'node:assert/strict';
import { it } from 'node:test';

import type { ScenarioCaseOfType } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { LruCacheNodeTimingEntity } from '../../src/entities/index.js';
import { LruCacheNodeTimingEntityScenarioCaseEntity } from './entities/LruCacheNodeTimingEntityScenarioCaseEntity.js';
import scenarioGroups from './LruCacheNodeTimingEntity.scenarios.json' with { 'type': 'json' };

class LruCacheNodeTimingEntityRunners {
  static 'invalid-timestamps'(scenarioCase: ScenarioCaseOfType<LruCacheNodeTimingEntityScenarioCaseEntity.Type, 'invalid-timestamps'>): void {
    const results: boolean[] = [];
    for (const timing of scenarioCase.input.timing) {
      const validateResult = LruCacheNodeTimingEntity.validate(timing);
      results.push(validateResult);
    }
    assert.deepStrictEqual(results, scenarioCase.expected.invalidChecks);
  }

  static 'valid-timestamps'(scenarioCase: ScenarioCaseOfType<LruCacheNodeTimingEntityScenarioCaseEntity.Type, 'valid-timestamps'>): void {
    const isValid = LruCacheNodeTimingEntity.validate(scenarioCase.input.timing);
    assert.equal(isValid, scenarioCase.expected.valid);
  }

  static declaresCreateMethod(): void {
    void it('accepts a plain unbranded literal for minimum-constrained properties and validates', () => {
      const createdEntity = LruCacheNodeTimingEntity.create({ 'expiresAt': 5, 'staleAt': 5 });
      assert.deepEqual(createdEntity, { 'expiresAt': 5, 'staleAt': 5 });
      const isValid = LruCacheNodeTimingEntity.validate(createdEntity);
      assert.equal(isValid, true);
    });
  }
}

ScenarioSuite.register({
  'entity': LruCacheNodeTimingEntityScenarioCaseEntity,
  'extraTests': LruCacheNodeTimingEntityRunners.declaresCreateMethod,
  'file': scenarioGroups,
  'name': 'LruCacheNodeTimingEntity',
  'runners': LruCacheNodeTimingEntityRunners
});
