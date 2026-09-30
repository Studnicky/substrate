import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import { FileLockConfigError } from '../../src/errors/FileLockConfigError.js';
import { FileLockConfigErrorScenarioCaseEntity } from './entities/FileLockConfigErrorScenarioCaseEntity.js';
import scenarioGroups from './FileLockConfigError.scenarios.json' with { 'type': 'json' };

class FileLockConfigErrorRunners {
  static 'constructs-with-code'(scenarioCase: ScenarioCaseOfType<FileLockConfigErrorScenarioCaseEntity.Type, 'constructs-with-code'>): void {
    const error = new FileLockConfigError(scenarioCase.input.message);

    assert.strictEqual(error.code, scenarioCase.expected.code);
    assert.strictEqual(error.message, scenarioCase.expected.message);
  }
}

ScenarioSuite.register({
  'entity': FileLockConfigErrorScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'FileLockConfigError',
  'runners': FileLockConfigErrorRunners
});
