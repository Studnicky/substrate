import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { DrilldownUtilities } from '../../src/modules/DrilldownUtilities.js';
import scenarioCases from './DrilldownUtilities.scenarios.json' with { 'type': 'json' };
import { DrilldownUtilitiesScenarioCaseEntity } from './entities/DrilldownUtilitiesScenarioCaseEntity.js';

class DrilldownUtilitiesRunners {
  // `expected.value` is JSON, so an absent result is spelled `null` in the corpus and
  // compared against `undefined` here — JSON has no undefined.
  static 'property-value'(scenarioCase: ScenarioCaseOfType<DrilldownUtilitiesScenarioCaseEntity.Type, 'property-value'>): void {
    const actual = DrilldownUtilities.getPropertyValue(scenarioCase.input.source, scenarioCase.input.path);
    const expected = scenarioCase.expected.value ?? undefined;

    assert.equal(actual, expected);
  }
}

ScenarioSuite.register({
  'entity': DrilldownUtilitiesScenarioCaseEntity,
  'file': scenarioCases,
  'name': 'DrilldownUtilities',
  'runners': DrilldownUtilitiesRunners
});
