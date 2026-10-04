import { VirtualFileSystem } from '@studnicky/virtual-fs/node';
import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { FileLock, FileLockTimeoutError } from '../../../src/file-lock/node/index.js';
import { FileLockVirtualFsScenarioCaseEntity } from './entities/FileLockVirtualFsScenarioCaseEntity.js';
import scenarioGroups from './FileLockVirtualFs.scenarios.json' with { 'type': 'json' };

class FileLockVirtualFsRunners {
  static async 'virtual-fs-mutual-exclusion'(
    scenarioCase: ScenarioCaseOfType<
      FileLockVirtualFsScenarioCaseEntity.Type,
      'virtual-fs-mutual-exclusion'
    >
  ): Promise<void> {
    const vfs = VirtualFileSystem.create({
      'seed': FileLockVirtualFsRunners.toSeedMap(scenarioCase.input.fileSystemSeed)
    });

    const lock1 = await FileLock.create({
      'fileSystem': vfs,
      'path': scenarioCase.input.lockPath,
      ...scenarioCase.input.fileLock.first
    });
    assert.ok(lock1 !== undefined);
    await assert.rejects(
      FileLock.create({
        'fileSystem': vfs,
        'path': scenarioCase.input.lockPath,
        ...scenarioCase.input.fileLock.second
      }),
      FileLockTimeoutError
    );
    lock1.release();
    const lock3 = await FileLock.create({
      'fileSystem': vfs,
      'path': scenarioCase.input.lockPath,
      ...scenarioCase.input.fileLock.third
    });
    assert.ok(lock3 !== undefined);
    lock3.release();
    assert.equal(scenarioCase.expected.firstAcquire, true);
    assert.equal(scenarioCase.expected.secondAcquireRejected, true);
    assert.equal(scenarioCase.expected.thirdAcquire, true);
  }

  static async 'virtual-fs-read-write'(
    scenarioCase: ScenarioCaseOfType<
      FileLockVirtualFsScenarioCaseEntity.Type,
      'virtual-fs-read-write'
    >
  ): Promise<void> {
    const vfs = VirtualFileSystem.create({
      'seed': FileLockVirtualFsRunners.toSeedMap(scenarioCase.input.fileSystemSeed)
    });
    const lock = await FileLock.create({
      'fileSystem': vfs,
      'path': scenarioCase.input.lockPath,
      ...scenarioCase.input.fileLock.first
    });
    assert.strictEqual(lock.read(), scenarioCase.expected.initialContents);
    lock.write(scenarioCase.input.updatedContents);
    lock.release();
    const lock2 = await FileLock.create({
      'fileSystem': vfs,
      'path': scenarioCase.input.lockPath,
      ...scenarioCase.input.fileLock.second
    });
    assert.strictEqual(lock2.read(), scenarioCase.expected.updatedContents);
    lock2.release();
  }

  private static toSeedMap(
    entries: readonly { 'content': string; 'path': string }[]
  ): Map<string, string> {
    const seed = new Map<string, string>();
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      assert.ok(entry !== undefined);
      seed.set(entry.path, entry.content);
    }
    return seed;
  }
}

ScenarioSuite.register({
  'entity': FileLockVirtualFsScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'FileLock VirtualFileSystem',
  'runners': FileLockVirtualFsRunners
});
