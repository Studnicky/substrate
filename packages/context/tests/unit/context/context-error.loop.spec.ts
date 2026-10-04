import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ScenarioFileCompiler } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { ContextError } from '../../../src/errors/ContextError.js';
import scenarioGroups from './context-error.scenarios.json' with { 'type': 'json' };
import { ContextErrorScenarioCaseEntity } from './entities/ContextErrorScenarioCaseEntity.js';

const fileIntake = ScenarioFileCompiler.compileIntake(ContextErrorScenarioCaseEntity);

class ContextErrorScenarioRunner {
  static construction(scenarioCase: ContextErrorScenarioCaseEntity.Type): void {
    const error = new ContextError(scenarioCase.input.error.message);
    assert.strictEqual(error.code, scenarioCase.expected.code);
    assert.strictEqual(error.message, scenarioCase.expected.message);
    assert.strictEqual(error.retryable, scenarioCase.expected.retryable);
    assert.strictEqual(error.correlationId, scenarioCase.expected.correlationId);
  }
}

void describe('Context errors', () => {
  const cases = fileIntake(scenarioGroups).cases;
  for (let index = 0; index < cases.length; index += 1) {
    const scenarioCase = cases[index];
    if (typeof scenarioCase !== 'undefined') {
      void it(scenarioCase.name, () => {
        ContextErrorScenarioRunner.construction(scenarioCase);
      });
    }
  }
});
