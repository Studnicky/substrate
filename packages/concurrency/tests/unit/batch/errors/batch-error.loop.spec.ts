import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite } from '../../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { BatchError } from '../../../../src/errors/BatchError.js';
import scenarioGroups from './batch-error.scenarios.json' with { 'type': 'json' };
import { BatchErrorScenarioCaseEntity } from './entities/BatchErrorScenarioCaseEntity.js';

class BatchErrorRunners {
  static 'construction'(scenarioCase: ScenarioCaseOfType<BatchErrorScenarioCaseEntity.Type, 'construction'>): void {
    const error = new BatchError(scenarioCase.input.error.message, scenarioCase.input.error.errorOptions);
    assert.strictEqual(error.code, scenarioCase.expected.code);
    assert.strictEqual(error.message, scenarioCase.expected.message);
    assert.strictEqual(error.retryable, scenarioCase.expected.retryable);
    assert.strictEqual(error.correlationId, scenarioCase.expected.correlationId);
    assert.deepStrictEqual(error.metadata, scenarioCase.expected.metadata);
    if (scenarioCase.input.error.errorOptions?.cause !== undefined) {
      assert.strictEqual(error.cause, scenarioCase.input.error.errorOptions.cause);
    }
  }
}

ScenarioSuite.register({
  'entity': BatchErrorScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'BatchError',
  'runners': BatchErrorRunners
});
