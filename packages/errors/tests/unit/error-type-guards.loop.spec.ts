import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { RuntimeError } from '../../src/errors/RuntimeError.js';
import { errorTypeGuards } from '../../src/validation/errorTypeGuards.js';
import { ErrorTypeGuardsScenarioCaseEntity } from './entities/ErrorTypeGuardsScenarioCaseEntity.js';
import scenarioGroups from './error-type-guards.scenarios.json' with { 'type': 'json' };

class ErrorTypeGuardsRunners {
  static 'guard'(scenarioCase: ScenarioCaseOfType<ErrorTypeGuardsScenarioCaseEntity.Type, 'guard'>): void {
    const guard = errorTypeGuards[scenarioCase.input.guard];
    const result = guard(ErrorTypeGuardsRunners.materializeError(scenarioCase.input.error));
    assert.strictEqual(result, scenarioCase.expected.result);
  }

  private static materializeError(error: ErrorTypeGuardsScenarioCaseEntity.Type['input']['error']): unknown {
    if (error !== null && typeof error === 'object' && 'shape' in error && error.shape === 'native-error') {
      const { 'shape': _shape, ...fields } = error;
      const nativeError = RuntimeError.create('native error');
      Object.assign(nativeError, fields);
      return nativeError;
    }
    return error;
  }
}

ScenarioSuite.register({
  'entity': ErrorTypeGuardsScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'error type guards',
  'runners': ErrorTypeGuardsRunners
});
