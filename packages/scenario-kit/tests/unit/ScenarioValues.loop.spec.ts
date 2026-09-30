import assert from 'node:assert/strict';
import { it } from 'node:test';

import type { ScenarioCaseOfType } from '../../src/types/ScenarioCaseOfType.js';

import { ScenarioValueError } from '../../src/errors/ScenarioValueError.js';
import { ScenarioSuite } from '../../src/ScenarioSuite.js';
import { ScenarioValues } from '../../src/ScenarioValues.js';
import { ScenarioValuesScenarioCaseEntity } from './entities/ScenarioValuesScenarioCaseEntity.js';
import scenarioGroups from './ScenarioValues.scenarios.json' with { 'type': 'json' };

class ScenarioValuesRunners {
  static 'requireArray'(scenarioCase: ScenarioCaseOfType<ScenarioValuesScenarioCaseEntity.Type, 'requireArray'>): void {
    ScenarioValuesRunners.check(scenarioCase.expected, () => {
      const result = ScenarioValues.requireArray(scenarioCase.input.value, scenarioCase.input.label);
      return result;
    });
  }

  static 'requireBoolean'(scenarioCase: ScenarioCaseOfType<ScenarioValuesScenarioCaseEntity.Type, 'requireBoolean'>): void {
    ScenarioValuesRunners.check(scenarioCase.expected, () => {
      const result = ScenarioValues.requireBoolean(scenarioCase.input.value, scenarioCase.input.label);
      return result;
    });
  }

  static 'requireDefined'(scenarioCase: ScenarioCaseOfType<ScenarioValuesScenarioCaseEntity.Type, 'requireDefined'>): void {
    ScenarioValuesRunners.check(scenarioCase.expected, () => {
      const result = ScenarioValues.requireDefined(scenarioCase.input.value, scenarioCase.input.label);
      return result;
    });
  }

  static 'requireFiniteNumber'(scenarioCase: ScenarioCaseOfType<ScenarioValuesScenarioCaseEntity.Type, 'requireFiniteNumber'>): void {
    ScenarioValuesRunners.check(scenarioCase.expected, () => {
      const result = ScenarioValues.requireFiniteNumber(scenarioCase.input.value, scenarioCase.input.label);
      return result;
    });
  }

  static 'requireInteger'(scenarioCase: ScenarioCaseOfType<ScenarioValuesScenarioCaseEntity.Type, 'requireInteger'>): void {
    ScenarioValuesRunners.check(scenarioCase.expected, () => {
      const result = ScenarioValues.requireInteger(scenarioCase.input.value, scenarioCase.input.label);
      return result;
    });
  }

  static 'requireNumber'(scenarioCase: ScenarioCaseOfType<ScenarioValuesScenarioCaseEntity.Type, 'requireNumber'>): void {
    ScenarioValuesRunners.check(scenarioCase.expected, () => {
      const result = ScenarioValues.requireNumber(scenarioCase.input.value, scenarioCase.input.label);
      return result;
    });
  }

  static 'requireNumberArray'(scenarioCase: ScenarioCaseOfType<ScenarioValuesScenarioCaseEntity.Type, 'requireNumberArray'>): void {
    ScenarioValuesRunners.check(scenarioCase.expected, () => {
      const result = ScenarioValues.requireNumberArray(scenarioCase.input.value, scenarioCase.input.label);
      return result;
    });
  }

  static 'requireProperty'(scenarioCase: ScenarioCaseOfType<ScenarioValuesScenarioCaseEntity.Type, 'requireProperty'>): void {
    const record = ScenarioValues.requireRecord(scenarioCase.input.value, scenarioCase.input.label);
    const key = ScenarioValues.requireDefined(scenarioCase.input.key, 'input.key');
    ScenarioValuesRunners.check(scenarioCase.expected, () => {
      const result = ScenarioValues.requireProperty(record, key, scenarioCase.input.label);
      return result;
    });
  }

  static 'requireRecord'(scenarioCase: ScenarioCaseOfType<ScenarioValuesScenarioCaseEntity.Type, 'requireRecord'>): void {
    ScenarioValuesRunners.check(scenarioCase.expected, () => {
      const result = ScenarioValues.requireRecord(scenarioCase.input.value, scenarioCase.input.label);
      return result;
    });
  }

  static 'requireString'(scenarioCase: ScenarioCaseOfType<ScenarioValuesScenarioCaseEntity.Type, 'requireString'>): void {
    ScenarioValuesRunners.check(scenarioCase.expected, () => {
      const result = ScenarioValues.requireString(scenarioCase.input.value, scenarioCase.input.label);
      return result;
    });
  }

  static 'requireStringArray'(scenarioCase: ScenarioCaseOfType<ScenarioValuesScenarioCaseEntity.Type, 'requireStringArray'>): void {
    ScenarioValuesRunners.check(scenarioCase.expected, () => {
      const result = ScenarioValues.requireStringArray(scenarioCase.input.value, scenarioCase.input.label);
      return result;
    });
  }

  static declaresUndefinedRejection(): void {
    void it('requireDefined rejects an absent value with a ScenarioValueError naming the label', () => {
      assert.throws(
        () => {
          ScenarioValues.requireDefined(undefined, 'field');
        },
        new ScenarioValueError('field is required')
      );
    });
  }

  private static check(expected: ScenarioValuesScenarioCaseEntity.Type['expected'], action: () => unknown): void {
    if (expected.outcome === 'returns') {
      assert.deepStrictEqual(action(), expected.detail);
    }
    if (expected.outcome === 'rejects') {
      assert.throws(action, { 'code': 'scenarioKit.valueInvalid', 'message': ScenarioValues.requireString(expected.detail, 'expected.detail'), 'name': 'ScenarioValueError' });
    }
  }
}

ScenarioSuite.register({
  'entity': ScenarioValuesScenarioCaseEntity,
  'extraTests': ScenarioValuesRunners.declaresUndefinedRejection,
  'file': scenarioGroups,
  'name': 'ScenarioValues',
  'runners': ScenarioValuesRunners
});
