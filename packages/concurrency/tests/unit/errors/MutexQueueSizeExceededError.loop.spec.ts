import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { QueueSizeExceededError } from '../../../src/errors/index.js';
import { QueueSizeExceededErrorScenarioCaseEntity } from './entities/QueueSizeExceededErrorScenarioCaseEntity.js';
import scenarioGroups from './MutexQueueSizeExceededError.scenarios.json' with { 'type': 'json' };

class QueueSizeExceededErrorRunners {
  static 'captures-key-and-queue-size'(
    scenarioCase: ScenarioCaseOfType<
      QueueSizeExceededErrorScenarioCaseEntity.Type,
      'captures-key-and-queue-size'
    >
  ): void {
    const error = new QueueSizeExceededError(
      scenarioCase.input.key,
      scenarioCase.input.maximumQueueSize
    );
    assert.strictEqual(error.code, scenarioCase.expected.code);
    assert.strictEqual(error.message, scenarioCase.expected.message);
    assert.strictEqual(error.key, scenarioCase.expected.key);
    assert.strictEqual(error.maximumQueueSize, scenarioCase.expected.maximumQueueSize);
  }
}

ScenarioSuite.register({
  'entity': QueueSizeExceededErrorScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'QueueSizeExceededError',
  'runners': QueueSizeExceededErrorRunners
});
