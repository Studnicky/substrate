import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { PatchOperationCoreEntity } from '../../../src/entities/PatchOperationCoreEntity.js';
import scenarioGroups from './PatchOperationCoreEntity.scenarios.json' with { type: 'json' };

type ScenarioCase =
  | { description: string; expected: { valid: boolean }; input: { operation: Record<string, unknown> }; shape: 'invalid-missing-path'; name: string }
  | { description: string; expected: { valid: boolean }; input: { operation: Record<string, unknown> }; shape: 'invalid-operation-variant'; name: string }
  | { description: string; expected: { valid: boolean }; input: { operation: Record<string, unknown> }; shape: 'valid-operation'; name: string };

function runCase(scenarioCase: ScenarioCase): void {
  assert.equal(PatchOperationCoreEntity.validate(scenarioCase.input.operation), scenarioCase.expected.valid);
}

void describe('PatchOperationCoreEntity', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
