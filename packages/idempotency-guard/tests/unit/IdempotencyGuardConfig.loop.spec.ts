import { SchemaIntakeError } from '@studnicky/entity/browser';
import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { IdempotencyGuard, IdempotencyGuardConfigError } from '../../src/index.js';
import { IdempotencyGuardOptionsEntity } from '../../src/entities/index.js';
import { IdempotencyGuardConfigScenarioCaseEntity } from './entities/IdempotencyGuardConfigScenarioCaseEntity.js';
import scenarioGroups from './IdempotencyGuardConfig.scenarios.json' with { type: 'json' };

const fileIntake = ScenarioFileCompiler.compileIntake(IdempotencyGuardConfigScenarioCaseEntity.Schema, IdempotencyGuardConfigScenarioCaseEntity.Node);

/** Exercises `IdempotencyGuard.create`'s typed surface: options a caller's compiler already accepts, checked again at runtime. */
function runTypedCase(
  scenarioCase: Extract<IdempotencyGuardConfigScenarioCaseEntity.Type, { shape: 'accepts-valid-options' | 'rejects-range-violation' }>
): void {
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

/** Exercises a shape `IdempotencyGuardOptionsEntity.InputType` forbids at compile time, through the entity's `unknown`-accepting surface directly. */
function runShapeViolationCase(scenarioCase: Extract<IdempotencyGuardConfigScenarioCaseEntity.Type, { shape: 'rejects-shape-violation' }>): void {
  assert.equal(IdempotencyGuardOptionsEntity.validate(scenarioCase.input.options), scenarioCase.expected.valid);
  assert.throws(() => {
    IdempotencyGuardOptionsEntity.intake(scenarioCase.input.options);
  }, SchemaIntakeError);
}

function runCase(scenarioCase: IdempotencyGuardConfigScenarioCaseEntity.Type): void {
  if (scenarioCase.shape === 'rejects-shape-violation') {
    runShapeViolationCase(scenarioCase);
    return;
  }
  runTypedCase(scenarioCase);
}

void describe('IdempotencyGuard config validation', () => {
  for (const scenarioCase of fileIntake(scenarioGroups).cases) {
    void it(scenarioCase.name, () => {
      runCase(scenarioCase);
    });
  }
});
