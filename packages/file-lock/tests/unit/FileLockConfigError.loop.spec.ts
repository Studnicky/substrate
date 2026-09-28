import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { FileLockConfigError } from '../../src/errors/FileLockConfigError.js';
import { FileLockConfigErrorScenarioCaseEntity } from './entities/FileLockConfigErrorScenarioCaseEntity.js';
import scenarioGroups from './FileLockConfigError.scenarios.json' with { type: 'json' };

const fileIntake = ScenarioFileCompiler.compileIntake(FileLockConfigErrorScenarioCaseEntity.Schema, FileLockConfigErrorScenarioCaseEntity.Node);

function runCase(scenarioCase: FileLockConfigErrorScenarioCaseEntity.Type): void {
  const error = new FileLockConfigError(scenarioCase.input.message);

  assert.strictEqual(error.code, scenarioCase.expected.code);
  assert.strictEqual(error.message, scenarioCase.expected.message);
}

void describe('FileLockConfigError', () => {
  for (const scenarioCase of fileIntake(scenarioGroups).cases) {
    void it(scenarioCase.name, () => {
      runCase(scenarioCase);
    });
  }
});
