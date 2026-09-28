import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { QueueSizeExceededError } from '../../../src/errors/index.js';
import { QueueSizeExceededErrorScenarioCaseEntity } from './entities/QueueSizeExceededErrorScenarioCaseEntity.js';
import scenarioGroups from './QueueSizeExceededError.scenarios.json' with { type: 'json' };

type ScenarioCase = QueueSizeExceededErrorScenarioCaseEntity.Type;

const fileIntake = ScenarioFileCompiler.compileIntake(QueueSizeExceededErrorScenarioCaseEntity.Schema, QueueSizeExceededErrorScenarioCaseEntity.Node);

function runScenario(scenarioCase: ScenarioCase): void {
  const error = new QueueSizeExceededError(scenarioCase.input.key, scenarioCase.input.maximumQueueSize);
  assert.strictEqual(error.code, scenarioCase.expected.code);
  assert.strictEqual(error.message, scenarioCase.expected.message);
  assert.strictEqual(error.key, scenarioCase.expected.key);
  assert.strictEqual(error.maximumQueueSize, scenarioCase.expected.maximumQueueSize);
}

void describe('QueueSizeExceededError', () => {
  for (const scenarioCase of fileIntake(scenarioGroups).cases) {
    void it(scenarioCase.name, () => {
      runScenario(scenarioCase);
    });
  }
});
