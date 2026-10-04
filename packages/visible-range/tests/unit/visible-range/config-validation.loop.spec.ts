import { RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { VisibleRangeError } from '../../../src/index.js';
import { VisibleRangeScenarioFactory } from '../VisibleRangeScenarioFactory.js';
import scenarioGroups from './config-validation.scenarios.json' with { 'type': 'json' };
import { ConfigValidationScenarioCaseEntity } from './entities/ConfigValidationScenarioCaseEntity.js';

class ConfigValidationRunners {
  static 'ambiguous-size'(scenarioCase: ScenarioCaseOfType<ConfigValidationScenarioCaseEntity.Type, 'ambiguous-size'>): void {
    ConfigValidationRunners.assertInvalidConfig(scenarioCase);
  }

  static 'error-args'(_scenarioCase: ScenarioCaseOfType<ConfigValidationScenarioCaseEntity.Type, 'error-args'>): void {
    const cause = RuntimeError.create('cause');
    const error = new VisibleRangeError('manual visible-range error', {
      'cause': cause,
      'correlationId': 'corr-123',
      'metadata': { 'source': 'unit-test' },
      'retryable': true
    });

    assert.ok(error instanceof VisibleRangeError);
    assert.equal(error.message, 'manual visible-range error');
    assert.equal(error.code, 'visibleRange.invalidConfig');
    assert.equal(error.cause, cause);
    assert.equal(error.correlationId, 'corr-123');
    assert.deepStrictEqual(error.metadata, { 'source': 'unit-test' });
    assert.equal(error.retryable, true);

    const defaulted = new VisibleRangeError('defaulted visible-range error');
    assert.equal(defaulted.retryable, false);
  }

  static 'missing-size'(scenarioCase: ScenarioCaseOfType<ConfigValidationScenarioCaseEntity.Type, 'missing-size'>): void {
    ConfigValidationRunners.assertInvalidConfig(scenarioCase);
  }

  static 'negative-size'(scenarioCase: ScenarioCaseOfType<ConfigValidationScenarioCaseEntity.Type, 'negative-size'>): void {
    ConfigValidationRunners.assertInvalidConfig(scenarioCase);
  }

  static 'zero-size'(scenarioCase: ScenarioCaseOfType<ConfigValidationScenarioCaseEntity.Type, 'zero-size'>): void {
    ConfigValidationRunners.assertInvalidConfig(scenarioCase);
  }

  private static assertInvalidConfig(
    scenarioCase: ScenarioCaseOfType<ConfigValidationScenarioCaseEntity.Type, 'ambiguous-size' | 'missing-size' | 'negative-size' | 'zero-size'>
  ): void {
    assert.throws(() => {
      VisibleRangeScenarioFactory.createRange({ 'visibleRange': scenarioCase.input.visibleRange });
    }, (caught) => {
      const thrown: unknown = caught;
      assert.ok(thrown instanceof VisibleRangeError);
      assert.equal(thrown.constructor.name, scenarioCase.expected.errorName);
      return true;
    });
  }
}

ScenarioSuite.register({
  'entity': ConfigValidationScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'VisibleRange config validation',
  'runners': ConfigValidationRunners
});
