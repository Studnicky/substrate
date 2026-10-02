import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite, TestWorkspace } from '@studnicky/scenario-kit/node';
import { BaseError } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { join } from 'node:path';

import { NodeFileSystem } from '../../src/NodeFileSystem.js';
import { NodeFileSystemScenarioCaseEntity } from './entities/NodeFileSystemScenarioCaseEntity.js';
import scenarioGroups from './NodeFileSystem.scenarios.json' with { 'type': 'json' };

class NodeFileSystemExerciseError extends BaseError {
  public override readonly name: string = 'NodeFileSystemExerciseError';

  public constructor(cause: unknown) {
    super({
      'cause': cause,
      'code': 'fileLock.testNodeFileSystemExerciseFailed',
      'message': 'NodeFileSystem rejected an operation the scenario expected to succeed',
      'retryable': false
    });
  }
}

/** What each `NodeFileSystem` operation reported while the scenario drove it. */
interface NodeFileSystemObservationInterface {
  readonly 'contentAfterWrite': string;
  readonly 'isFile': boolean;
  readonly 'listing': readonly string[];
  readonly 'renamedExistsAfterRename': boolean;
  readonly 'renamedExistsAfterUnlink': boolean;
  readonly 'rootExists': boolean;
}

class NodeFileSystemRunners {
  static 'forwards-file-system-operations'(scenarioCase: ScenarioCaseOfType<NodeFileSystemScenarioCaseEntity.Type, 'forwards-file-system-operations'>): void {
    using workspace = TestWorkspace.create('file-lock-node-fs-');

    const observation = NodeFileSystemRunners.exercise(workspace.root);

    assert.strictEqual(observation.rootExists, true);
    assert.deepStrictEqual(observation.listing, ['nested']);
    assert.strictEqual(observation.contentAfterWrite, 'hello');
    assert.ok(observation.isFile);
    assert.strictEqual(observation.renamedExistsAfterRename, true);
    assert.strictEqual(observation.renamedExistsAfterUnlink, false);

    workspace.write('native.txt', 'native');
    assert.strictEqual(workspace.read('native.txt'), 'native');
    assert.strictEqual(scenarioCase.expected.forwarded, true);
  }

  private static exercise(root: string): NodeFileSystemObservationInterface {
    const fileSystem = new NodeFileSystem();
    try {
      const nested = join(root, 'nested');
      const file = join(nested, 'data.txt');
      const renamed = join(root, 'renamed.txt');

      const rootExists = fileSystem.existsSync(root);
      fileSystem.mkdirSync(nested, { 'recursive': true });
      const listing = fileSystem.readdirSync(root);
      fileSystem.writeFileSync(file, 'hello', 'utf8');
      const contentAfterWrite = fileSystem.readFileSync(file, 'utf8');
      const isFile = fileSystem.statSync(file).isFile();
      fileSystem.renameSync(file, renamed);
      const renamedExistsAfterRename = fileSystem.existsSync(renamed);
      fileSystem.unlinkSync(renamed);
      const renamedExistsAfterUnlink = fileSystem.existsSync(renamed);

      const observation: NodeFileSystemObservationInterface = {
        'contentAfterWrite': contentAfterWrite,
        'isFile': isFile,
        'listing': listing,
        'renamedExistsAfterRename': renamedExistsAfterRename,
        'renamedExistsAfterUnlink': renamedExistsAfterUnlink,
        'rootExists': rootExists
      };
      return observation;
    } catch (cause) {
      throw new NodeFileSystemExerciseError(cause);
    }
  }
}

ScenarioSuite.register({
  'entity': NodeFileSystemScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'NodeFileSystem',
  'runners': NodeFileSystemRunners
});
