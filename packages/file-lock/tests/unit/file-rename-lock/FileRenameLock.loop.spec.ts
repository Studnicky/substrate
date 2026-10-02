import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite, TestWorkspace } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import { FileLockContentionError, FileRenameLock } from '../../../src/node/index.js';
import { FileRenameLockScenarioCaseEntity } from './entities/FileRenameLockScenarioCaseEntity.js';
import scenarioGroups from './FileRenameLock.scenarios.json' with { 'type': 'json' };

class FileRenameLockRunners {
  static 'acquire-release'(scenarioCase: ScenarioCaseOfType<FileRenameLockScenarioCaseEntity.Type, 'acquire-release'>): void {
    using workspace = TestWorkspace.create('file-rename-lock-tests-');
    const path = workspace.write(scenarioCase.input.path, scenarioCase.input.content);

    const lock = FileRenameLock.create({ 'path': path });
    lock.acquire();
    assert.equal(workspace.exists(scenarioCase.input.path), scenarioCase.expected.existsWhileHeld);
    lock.release();
    assert.equal(workspace.exists(scenarioCase.input.path), scenarioCase.expected.existsAfterRelease);
  }

  static 'contention'(scenarioCase: ScenarioCaseOfType<FileRenameLockScenarioCaseEntity.Type, 'contention'>): void {
    using workspace = TestWorkspace.create('file-rename-lock-tests-');
    const path = workspace.write(scenarioCase.input.path, scenarioCase.input.content);

    const heldLock = FileRenameLock.create({ 'path': path });
    heldLock.acquire();
    const contender = FileRenameLock.create({ 'path': path });
    assert.throws(() => {
      contender.acquire();
    }, FileLockContentionError);
    heldLock.release();
  }
}

ScenarioSuite.register({
  'entity': FileRenameLockScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'FileRenameLock',
  'runners': FileRenameLockRunners
});
