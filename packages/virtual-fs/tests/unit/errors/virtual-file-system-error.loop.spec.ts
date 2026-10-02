import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import { VirtualFileSystemError } from '../../../src/errors/VirtualFileSystemError.js';
import { VirtualFileSystemErrorScenarioCaseEntity } from './entities/VirtualFileSystemErrorScenarioCaseEntity.js';
import scenarioGroups from './virtual-file-system-error.scenarios.json' with { 'type': 'json' };

class VirtualFileSystemErrorRunners {
  static 'construction'(scenarioCase: ScenarioCaseOfType<VirtualFileSystemErrorScenarioCaseEntity.Type, 'construction'>): void {
    const error = new VirtualFileSystemError(scenarioCase.input.error.message, scenarioCase.input.error.argumentList);
    assert.strictEqual(error.code, scenarioCase.expected.code);
    assert.strictEqual(error.message, scenarioCase.expected.message);
    assert.strictEqual(error.retryable, scenarioCase.expected.retryable);
    assert.strictEqual(error.correlationId, scenarioCase.expected.correlationId);
    assert.deepStrictEqual(error.metadata, scenarioCase.expected.metadata);
    if (scenarioCase.input.error.argumentList?.cause !== undefined) {
      assert.strictEqual(error.cause, scenarioCase.input.error.argumentList.cause);
    }
  }
}

ScenarioSuite.register({
  'entity': VirtualFileSystemErrorScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'VirtualFileSystemError',
  'runners': VirtualFileSystemErrorRunners
});
