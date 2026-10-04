import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { InvalidClientFactory } from '../../helpers/InvalidClientFactory.js';
import { RejectionProbe } from '../../helpers/RejectionProbe.js';
import { RuntimeValueMaterializer } from '../../helpers/RuntimeValueMaterializer.js';
import { OptionsScenarioCaseEntity } from './entities/OptionsScenarioCaseEntity.js';
import scenarioGroups from './options.scenarios.json' with { 'type': 'json' };

class OptionsRunners {
  static 'ok'(scenarioCase: ScenarioCaseOfType<OptionsScenarioCaseEntity.Type, 'ok', 'outcome'>): void {
    const config = OptionsRunners.buildConfig(scenarioCase.input.options);
    assert.doesNotThrow(() => {
      InvalidClientFactory.create(config);
    });
  }

  static 'throws'(scenarioCase: ScenarioCaseOfType<OptionsScenarioCaseEntity.Type, 'throws', 'outcome'>): void {
    assert.ok(scenarioCase.expected.messageIncludes !== undefined);
    const config = OptionsRunners.buildConfig(scenarioCase.input.options);
    const caught = RejectionProbe.captureSync(() => {
      const created = InvalidClientFactory.create(config);
      return created;
    });
    assert.ok(caught instanceof Error);
    assert.ok(caught.message.length > 0);
  }

  private static buildConfig(value: ScenarioCaseOfType<OptionsScenarioCaseEntity.Type, 'ok', 'outcome'>['input']['options']): object {
    const config = { 'options': RuntimeValueMaterializer.materialize(value) };
    return config;
  }
}

ScenarioSuite.registerBy('outcome', {
  'entity': OptionsScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'fetch options validation',
  'runners': OptionsRunners
});
