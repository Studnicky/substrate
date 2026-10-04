import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { FetchClient } from '../../../src/node/index.js';
import { InvalidClientFactory } from '../../helpers/InvalidClientFactory.js';
import { RejectionProbe } from '../../helpers/RejectionProbe.js';
import { ValidateUrlScenarioCaseEntity } from './entities/ValidateUrlScenarioCaseEntity.js';
import scenarioGroups from './validate-url.scenarios.json' with { 'type': 'json' };

class ValidateUrlRunners {
  static 'empty'(scenarioCase: ScenarioCaseOfType<ValidateUrlScenarioCaseEntity.Type, 'empty'>): void {
    ValidateUrlRunners.assertRejected(scenarioCase.input.value);
  }

  static 'invalid'(scenarioCase: ScenarioCaseOfType<ValidateUrlScenarioCaseEntity.Type, 'invalid'>): void {
    ValidateUrlRunners.assertRejected(scenarioCase.input.value);
  }

  static 'non-string'(scenarioCase: ScenarioCaseOfType<ValidateUrlScenarioCaseEntity.Type, 'non-string'>): void {
    ValidateUrlRunners.assertRejected(scenarioCase.input.value);
  }

  static 'valid'(scenarioCase: ScenarioCaseOfType<ValidateUrlScenarioCaseEntity.Type, 'valid'>): void {
    const created = InvalidClientFactory.create({ 'baseURL': scenarioCase.input.value });
    assert.ok(created instanceof FetchClient);
  }

  private static assertRejected(baseURL: ValidateUrlScenarioCaseEntity.Type['input']['value']): void {
    const caught = RejectionProbe.captureSync(() => {
      const created = InvalidClientFactory.create({ 'baseURL': baseURL });
      return created;
    });
    assert.ok(caught instanceof Error);
    assert.ok(caught.message.length > 0);
  }
}

ScenarioSuite.register({
  'entity': ValidateUrlScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'validate url schema',
  'runners': ValidateUrlRunners
});
