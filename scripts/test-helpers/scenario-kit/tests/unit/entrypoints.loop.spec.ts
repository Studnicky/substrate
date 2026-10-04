import assert from 'node:assert/strict';
import { it } from 'node:test';

import type { ScenarioCaseOfType } from '../../src/types/index.js';

import { ScenarioFileCompiler, ScenarioSuite, ScenarioValues, TestWorkspace } from '../../src/node/index.js';

void it('exposes the private scenario helper node and type entrypoints', () => {
  const values: readonly unknown[] = [ScenarioFileCompiler, ScenarioSuite, ScenarioValues, TestWorkspace];
  assert.equal(values.length, 4);
  const typeEvidence: ScenarioCaseOfType<{ readonly 'name': string; readonly 'shape': 'entrypoint' }, 'entrypoint'> = { 'name': 'private-entrypoint', 'shape': 'entrypoint' };
  assert.equal(typeEvidence.shape, 'entrypoint');
});
