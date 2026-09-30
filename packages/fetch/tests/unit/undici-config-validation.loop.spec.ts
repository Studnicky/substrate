import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import { InvalidClientFactory } from '../helpers/InvalidClientFactory.js';
import { RejectionProbe } from '../helpers/RejectionProbe.js';
import { RuntimeValueMaterializer } from '../helpers/RuntimeValueMaterializer.js';
import { UndiciConfigValidationScenarioCaseEntity } from './entities/UndiciConfigValidationScenarioCaseEntity.js';
import scenarioGroups from './undici-config-validation.scenarios.json' with { 'type': 'json' };

class UndiciConfigValidationRunners {
  static 'ok'(scenarioCase: ScenarioCaseOfType<UndiciConfigValidationScenarioCaseEntity.Type, 'ok', 'outcome'>): void {
    const config = UndiciConfigValidationRunners.buildConfig(scenarioCase.input.dispatcher);
    assert.doesNotThrow(() => {
      InvalidClientFactory.create(config);
    });
  }

  static 'throws'(scenarioCase: ScenarioCaseOfType<UndiciConfigValidationScenarioCaseEntity.Type, 'throws', 'outcome'>): void {
    assert.ok(scenarioCase.expected.messageIncludes !== undefined);
    const config = UndiciConfigValidationRunners.buildConfig(scenarioCase.input.dispatcher);
    const caught = RejectionProbe.captureSync(() => {
      const created = InvalidClientFactory.create(config);
      return created;
    });
    assert.ok(caught instanceof Error);
    assert.ok(caught.message.length > 0);
  }

  private static buildConfig(value: ScenarioCaseOfType<UndiciConfigValidationScenarioCaseEntity.Type, 'ok', 'outcome'>['input']['dispatcher']): object {
    const config = { 'dispatcher': RuntimeValueMaterializer.materialize(value) };
    return config;
  }
}

ScenarioSuite.registerBy('outcome', {
  'entity': UndiciConfigValidationScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'pool configuration validation',
  'runners': UndiciConfigValidationRunners
});
