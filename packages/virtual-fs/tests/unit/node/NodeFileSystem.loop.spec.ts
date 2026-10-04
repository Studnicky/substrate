import { Predicates } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import type { AsyncFileSystemInterface } from '../../../src/interfaces/AsyncFileSystemInterface.js';

import { TestWorkspace } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { VirtualFileSystemError } from '../../../src/errors/VirtualFileSystemError.js';
import { NodeFileSystem } from '../../../src/node/NodeFileSystem.js';

interface OperationCaseInterface {
  readonly 'expectedCauseCode': string;
  readonly 'name': string;
  readonly 'run': (fileSystem: AsyncFileSystemInterface, root: string) => Promise<unknown>;
}

const operationCases: readonly OperationCaseInterface[] = [
  {
    'expectedCauseCode': 'ENOENT',
    'name': 'readFile of a missing file',
    'run': (fileSystem, root) => { const operation = fileSystem.readFile(join(root, 'missing.txt')); return operation; }
  },
  {
    'expectedCauseCode': 'ENOENT',
    'name': 'readdir of a missing directory',
    'run': (fileSystem, root) => { const operation = fileSystem.readdir(join(root, 'missing-directory')); return operation; }
  },
  {
    'expectedCauseCode': 'ENOENT',
    'name': 'writeFile into a missing directory',
    'run': (fileSystem, root) => { const operation = fileSystem.writeFile(join(root, 'missing-directory', 'file.txt'), 'data'); return operation; }
  },
  {
    'expectedCauseCode': 'ENOENT',
    'name': 'remove of a missing entry',
    'run': (fileSystem, root) => { const operation = fileSystem.remove(join(root, 'missing.txt')); return operation; }
  },
  {
    'expectedCauseCode': 'EEXIST',
    'name': 'mkdir over an existing file',
    'run': (fileSystem, root) => { const operation = fileSystem.mkdir(join(root, 'existing-file.txt')); return operation; }
  }
];

class NodeFileSystemFailureRunner {
  public static async assertRejects(operationCase: OperationCaseInterface): Promise<void> {
    using workspace = TestWorkspace.create('virtual-fs-node-');
    workspace.write('existing-file.txt', 'present');
    await assert.rejects(operationCase.run(new NodeFileSystem(), workspace.root), (caught) => {
      const thrown: unknown = caught;
      assert.ok(thrown instanceof VirtualFileSystemError);
      assert.ok(Predicates.isObject(thrown.cause));
      assert.equal(thrown.cause.code, operationCase.expectedCauseCode);
      assert.equal(thrown.message, VirtualFileSystemError.toMessage(thrown.cause));
      return true;
    });
  }
}

void describe('NodeFileSystem platform failures', () => {
  for (let index = 0; index < operationCases.length; index += 1) {
    const operationCase = operationCases[index];
    if (operationCase !== undefined) {
      void it(`${operationCase.name} rejects with a VirtualFileSystemError carrying the fs error as cause`, async () => {
        await NodeFileSystemFailureRunner.assertRejects(operationCase);
      });
    }
  }
});
