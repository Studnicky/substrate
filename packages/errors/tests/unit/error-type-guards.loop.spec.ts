import { RuntimeError } from '../../src/errors/RuntimeError.js';
import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { errorTypeGuards } from '../../src/validation/errorTypeGuards.js';
import { ErrorTypeGuardsScenarioCaseEntity } from './entities/ErrorTypeGuardsScenarioCaseEntity.js';
import scenarioGroups from './error-type-guards.scenarios.json' with { type: 'json' };

type ScenarioCase = ErrorTypeGuardsScenarioCaseEntity.Type;
type ErrorFixture = ScenarioCase['input']['error'];

const fileIntake = ScenarioFileCompiler.compileIntake(ErrorTypeGuardsScenarioCaseEntity.Schema, ErrorTypeGuardsScenarioCaseEntity.Node);

function materializeError(error: ErrorFixture): ErrorFixture | Error {
  if (error !== null && typeof error === 'object' && 'shape' in error && error.shape === 'native-error') {
    const nativeError = RuntimeError.create('native error');
    Object.assign(nativeError, error);
    Reflect.deleteProperty(nativeError, 'shape');
    return nativeError;
  }

  return error;
}

function runCase(scenarioCase: ScenarioCase): void {
  const guard = errorTypeGuards[scenarioCase.input.guard];
  const result = guard(materializeError(scenarioCase.input.error));
  assert.strictEqual(result, scenarioCase.expected.result);
}

void describe('error type guards', () => {
  for (const scenario of fileIntake(scenarioGroups).cases) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
