import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite, ScenarioValues } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { InvalidClientFactory } from '../../helpers/InvalidClientFactory.js';
import { RejectionProbe } from '../../helpers/RejectionProbe.js';
import { RuntimeValueMaterializer } from '../../helpers/RuntimeValueMaterializer.js';
import scenarioGroups from './config.scenarios.json' with { 'type': 'json' };
import { ConfigScenarioCaseEntity } from './entities/ConfigScenarioCaseEntity.js';

class ConfigRunners {
  static 'ok'(scenarioCase: ScenarioCaseOfType<ConfigScenarioCaseEntity.Type, 'ok', 'outcome'>): void {
    const config = ConfigRunners.buildConfig(scenarioCase.input.fetchClient);
    assert.doesNotThrow(() => {
      InvalidClientFactory.create(config);
    });
  }

  static 'throws'(scenarioCase: ScenarioCaseOfType<ConfigScenarioCaseEntity.Type, 'throws', 'outcome'>): void {
    assert.ok(scenarioCase.expected.messageIncludes !== undefined);
    const config = ConfigRunners.buildConfig(scenarioCase.input.fetchClient);
    const caught = RejectionProbe.captureSync(() => {
      const created = InvalidClientFactory.create(config);
      return created;
    });
    assert.ok(caught instanceof Error);
    assert.ok(caught.message.length > 0);
  }

  private static buildConfig(value: ScenarioCaseOfType<ConfigScenarioCaseEntity.Type, 'ok', 'outcome'>['input']['fetchClient']): object {
    const config = ScenarioValues.requireRecord(RuntimeValueMaterializer.materialize(value), 'input.fetchClient');
    return config;
  }
}

ScenarioSuite.registerBy('outcome', {
  'entity': ConfigScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'fetch config',
  'runners': ConfigRunners
});
