import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { SchemaIntakeError } from '@studnicky/entity/browser';
import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import { IdempotencyGuardOptionsEntity } from '../../src/entities/index.js';
import { IdempotencyGuard, IdempotencyGuardConfigError } from '../../src/index.js';
import { IdempotencyGuardConfigScenarioCaseEntity } from './entities/IdempotencyGuardConfigScenarioCaseEntity.js';
import scenarioGroups from './IdempotencyGuardConfig.scenarios.json' with { 'type': 'json' };

class IdempotencyGuardConfigRunners {
  /** Exercises `IdempotencyGuard.create`'s typed surface: options a caller's compiler already accepts, checked again at runtime. */
  static 'accepts-valid-options'(scenarioCase: ScenarioCaseOfType<IdempotencyGuardConfigScenarioCaseEntity.Type, 'accepts-valid-options'>): void {
    const guard = IdempotencyGuard.create(scenarioCase.input.options);
    assert.ok(guard instanceof IdempotencyGuard);
  }

  static 'rejects-range-violation'(scenarioCase: ScenarioCaseOfType<IdempotencyGuardConfigScenarioCaseEntity.Type, 'rejects-range-violation'>): void {
    assert.throws(
      () => {
        IdempotencyGuard.create(scenarioCase.input.options);
      },
      (thrown) => {
        const error: unknown = thrown;
        let accepted = false;
        if (error instanceof IdempotencyGuardConfigError) {
          assert.equal(error.code, scenarioCase.expected.code);
          accepted = true;
        }
        return accepted;
      }
    );
  }

  /** Exercises a shape `IdempotencyGuardOptionsEntity.InputType` forbids at compile time, through the entity's `unknown`-accepting surface directly. */
  static 'rejects-shape-violation'(scenarioCase: ScenarioCaseOfType<IdempotencyGuardConfigScenarioCaseEntity.Type, 'rejects-shape-violation'>): void {
    assert.equal(IdempotencyGuardOptionsEntity.validate(scenarioCase.input.options), scenarioCase.expected.valid);
    assert.throws(() => {
      IdempotencyGuardOptionsEntity.intake(scenarioCase.input.options);
    }, SchemaIntakeError);
  }
}

ScenarioSuite.register({
  'entity': IdempotencyGuardConfigScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'IdempotencyGuard config validation',
  'runners': IdempotencyGuardConfigRunners
});
