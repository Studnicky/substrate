import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { IdempotencyGuard, IdempotencyGuardConfigError } from '../../src/index.js';
import { IdempotencyGuardConfigScenarioCaseEntity } from './entities/IdempotencyGuardConfigScenarioCaseEntity.js';
import scenarioGroups from './IdempotencyGuardConfig.scenarios.json' with { type: 'json' };

const fileIntake = ScenarioFileCompiler.compileIntake(IdempotencyGuardConfigScenarioCaseEntity.Schema, IdempotencyGuardConfigScenarioCaseEntity.Node);

function runCase(scenarioCase: IdempotencyGuardConfigScenarioCaseEntity.Type): void {
  if (scenarioCase.shape === 'accepts-valid-options') {
    const guard = IdempotencyGuard.create(scenarioCase.input.options);
    assert.ok(guard instanceof IdempotencyGuard);
    return;
  }

  assert.throws(
    () => {
      IdempotencyGuard.create(scenarioCase.input.options);
    },
    (error: unknown) => {
      if (!(error instanceof IdempotencyGuardConfigError)) {
        return false;
      }
      assert.equal(error.code, scenarioCase.expected.code);
      return true;
    }
  );
}

void describe('IdempotencyGuard config validation', () => {
  for (const scenarioCase of fileIntake(scenarioGroups).cases) {
    void it(scenarioCase.name, () => {
      runCase(scenarioCase);
    });
  }
});
