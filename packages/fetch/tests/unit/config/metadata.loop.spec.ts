import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import { InvalidClientFactory } from '../../helpers/InvalidClientFactory.js';
import { RejectionProbe } from '../../helpers/RejectionProbe.js';
import { RuntimeValueMaterializer } from '../../helpers/RuntimeValueMaterializer.js';
import { MetadataScenarioCaseEntity } from './entities/MetadataScenarioCaseEntity.js';
import scenarioGroups from './metadata.scenarios.json' with { 'type': 'json' };

class MetadataRunners {
  static 'ok'(scenarioCase: ScenarioCaseOfType<MetadataScenarioCaseEntity.Type, 'ok', 'outcome'>): void {
    const config = MetadataRunners.buildConfig(scenarioCase.input.metadata);
    assert.doesNotThrow(() => {
      InvalidClientFactory.create(config);
    });
  }

  static 'throws'(scenarioCase: ScenarioCaseOfType<MetadataScenarioCaseEntity.Type, 'throws', 'outcome'>): void {
    assert.ok(scenarioCase.expected.messageIncludes !== undefined);
    const config = MetadataRunners.buildConfig(scenarioCase.input.metadata);
    const caught = RejectionProbe.captureSync(() => {
      const created = InvalidClientFactory.create(config);
      return created;
    });
    assert.ok(caught instanceof Error);
    assert.ok(caught.message.length > 0);
  }

  private static buildConfig(value: ScenarioCaseOfType<MetadataScenarioCaseEntity.Type, 'ok', 'outcome'>['input']['metadata']): object {
    const config = { 'metadata': RuntimeValueMaterializer.materialize(value) };
    return config;
  }
}

ScenarioSuite.registerBy('outcome', {
  'entity': MetadataScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'fetch metadata validation',
  'runners': MetadataRunners
});
