import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { VirtualFileSystem } from '@studnicky/virtual-fs';

import { FileLock, FileLockTimeoutError } from '../../src/node/index.js';
import scenarioGroups from './FileLockVirtualFs.scenarios.json' with { type: 'json' };

type ScenarioCase =
  | {
      description: string;
      expected: { firstAcquire: true; secondAcquireRejected: true; thirdAcquire: true };
      input: {
        fileLock: {
          first: { timeoutMs: number };
          second: { timeoutMs: number };
          third: { timeoutMs: number };
        };
        fileSystemSeed: [string, string][];
        lockPath: string;
      };
      shape: 'virtual-fs-mutual-exclusion';
      name: string;
    }
  | {
      description: string;
      expected: { initialContents: string; updatedContents: string };
      input: {
        fileLock: {
          first: { timeoutMs: number };
          second: { timeoutMs: number };
        };
        fileSystemSeed: [string, string][];
        lockPath: string;
        updatedContents: string;
      };
      shape: 'virtual-fs-read-write';
      name: string;
    };

type ScenarioShape = ScenarioCase['shape'];
type ScenarioRunner<Shape extends ScenarioShape> = (scenarioCase: Extract<ScenarioCase, { shape: Shape }>) => Promise<void>;
type ScenarioRunnerMap = { readonly [Shape in ScenarioShape]: ScenarioRunner<Shape> };

const runnerMap: ScenarioRunnerMap = {
  'virtual-fs-mutual-exclusion': async (scenarioCase) => {
    const vfs = VirtualFileSystem.create({ seed: new Map(scenarioCase.input.fileSystemSeed) });

    const lock1 = await FileLock.create({ fileSystem: vfs, path: scenarioCase.input.lockPath, ...scenarioCase.input.fileLock.first });
    assert.ok(lock1 !== undefined);
    await assert.rejects(
      FileLock.create({ fileSystem: vfs, path: scenarioCase.input.lockPath, ...scenarioCase.input.fileLock.second }),
      (error: Error) => error instanceof FileLockTimeoutError
    );
    lock1.release();
    const lock3 = await FileLock.create({ fileSystem: vfs, path: scenarioCase.input.lockPath, ...scenarioCase.input.fileLock.third });
    assert.ok(lock3 !== undefined);
    lock3.release();
    assert.equal(scenarioCase.expected.firstAcquire, true);
    assert.equal(scenarioCase.expected.secondAcquireRejected, true);
    assert.equal(scenarioCase.expected.thirdAcquire, true);
  },
  'virtual-fs-read-write': async (scenarioCase) => {
    const vfs = VirtualFileSystem.create({ seed: new Map(scenarioCase.input.fileSystemSeed) });
    const lock = await FileLock.create({ fileSystem: vfs, path: scenarioCase.input.lockPath, ...scenarioCase.input.fileLock.first });
    assert.strictEqual(lock.read(), scenarioCase.expected.initialContents);
    lock.write(scenarioCase.input.updatedContents);
    lock.release();
    const lock2 = await FileLock.create({ fileSystem: vfs, path: scenarioCase.input.lockPath, ...scenarioCase.input.fileLock.second });
    assert.strictEqual(lock2.read(), scenarioCase.expected.updatedContents);
    lock2.release();
  },
};

function runCase<Shape extends ScenarioShape>(scenarioCase: Extract<ScenarioCase, { shape: Shape }>): Promise<void> {
  return runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('FileLock VirtualFileSystem', () => {
  for (const scenarioCase of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenarioCase.name, async () => {
      await runCase(scenarioCase);
    });
  }
});
