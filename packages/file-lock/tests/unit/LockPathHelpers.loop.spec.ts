import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { LockPathHelpers } from '../../src/LockPathHelpers.js';
import { LockPathHelpersScenarioCaseEntity } from './entities/LockPathHelpersScenarioCaseEntity.js';
import scenarioGroups from './LockPathHelpers.scenarios.json' with { type: 'json' };

type ScenarioCase = LockPathHelpersScenarioCaseEntity.Type;

const fileIntake = ScenarioFileCompiler.compileIntake(LockPathHelpersScenarioCaseEntity.Schema, LockPathHelpersScenarioCaseEntity.Node);

const runnerMap: Record<ScenarioCase['shape'], (scenarioCase: ScenarioCase) => void> = {
  'dirname-bare-relative': (scenarioCase) => {
    assert.strictEqual(LockPathHelpers.dirname(scenarioCase.input.path), scenarioCase.expected.value);
  },
  'dirname-relative-directory': (scenarioCase) => {
    assert.strictEqual(LockPathHelpers.dirname(scenarioCase.input.path), scenarioCase.expected.value);
  },
  'dirname-absolute-single': (scenarioCase) => {
    assert.strictEqual(LockPathHelpers.dirname(scenarioCase.input.path), scenarioCase.expected.value);
  },
  'dirname-absolute-multi': (scenarioCase) => {
    assert.strictEqual(LockPathHelpers.dirname(scenarioCase.input.path), scenarioCase.expected.value);
  },
  'basename-bare-relative': (scenarioCase) => {
    assert.strictEqual(LockPathHelpers.basename(scenarioCase.input.path), scenarioCase.expected.value);
  },
  'basename-nested': (scenarioCase) => {
    assert.strictEqual(LockPathHelpers.basename(scenarioCase.input.path), scenarioCase.expected.value);
  }
};

function runCase(scenarioCase: ScenarioCase): void {
  runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('LockPathHelpers', () => {
  for (const scenarioCase of fileIntake(scenarioGroups).cases) {
    void it(scenarioCase.name, () => {
      runCase(scenarioCase);
    });
  }
});
