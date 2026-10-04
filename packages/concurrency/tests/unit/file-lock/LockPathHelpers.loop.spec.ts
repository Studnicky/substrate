import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { LockPathHelpers } from '../../../src/file-lock/LockPathHelpers.js';
import { LockPathHelpersScenarioCaseEntity } from './entities/LockPathHelpersScenarioCaseEntity.js';
import scenarioGroups from './LockPathHelpers.scenarios.json' with { 'type': 'json' };

class LockPathHelpersRunners {
  static 'basename-bare-relative'(
    scenarioCase: ScenarioCaseOfType<
      LockPathHelpersScenarioCaseEntity.Type,
      'basename-bare-relative'
    >
  ): void {
    const result = LockPathHelpers.basename(scenarioCase.input.path);
    const expected = scenarioCase.expected.value;
    assert.strictEqual(result, expected);
  }

  static 'basename-nested'(
    scenarioCase: ScenarioCaseOfType<LockPathHelpersScenarioCaseEntity.Type, 'basename-nested'>
  ): void {
    const result = LockPathHelpers.basename(scenarioCase.input.path);
    const expected = scenarioCase.expected.value;
    assert.strictEqual(result, expected);
  }

  static 'dirname-absolute-multi'(
    scenarioCase: ScenarioCaseOfType<
      LockPathHelpersScenarioCaseEntity.Type,
      'dirname-absolute-multi'
    >
  ): void {
    const result = LockPathHelpers.dirname(scenarioCase.input.path);
    const expected = scenarioCase.expected.value;
    assert.strictEqual(result, expected);
  }

  static 'dirname-absolute-single'(
    scenarioCase: ScenarioCaseOfType<
      LockPathHelpersScenarioCaseEntity.Type,
      'dirname-absolute-single'
    >
  ): void {
    const result = LockPathHelpers.dirname(scenarioCase.input.path);
    const expected = scenarioCase.expected.value;
    assert.strictEqual(result, expected);
  }

  static 'dirname-bare-relative'(
    scenarioCase: ScenarioCaseOfType<
      LockPathHelpersScenarioCaseEntity.Type,
      'dirname-bare-relative'
    >
  ): void {
    const result = LockPathHelpers.dirname(scenarioCase.input.path);
    const expected = scenarioCase.expected.value;
    assert.strictEqual(result, expected);
  }

  static 'dirname-relative-directory'(
    scenarioCase: ScenarioCaseOfType<
      LockPathHelpersScenarioCaseEntity.Type,
      'dirname-relative-directory'
    >
  ): void {
    const result = LockPathHelpers.dirname(scenarioCase.input.path);
    const expected = scenarioCase.expected.value;
    assert.strictEqual(result, expected);
  }
}

ScenarioSuite.register({
  'entity': LockPathHelpersScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'LockPathHelpers',
  'runners': LockPathHelpersRunners
});
