import { Predicates } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';

import type { AsyncFileSystemInterface } from '../../../src/interfaces/AsyncFileSystemInterface.js';

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

void describe('NodeFileSystem platform failures', () => {
  let root = '';

  before(async () => {
    root = await mkdtemp(join(tmpdir(), 'virtual-fs-node-'));
    await writeFile(join(root, 'existing-file.txt'), 'present');
  });

  after(async () => {
    await rm(root, { 'force': true, 'recursive': true });
  });

  for (const operationCase of operationCases) {
    void it(`${operationCase.name} rejects with a VirtualFileSystemError carrying the fs error as cause`, async () => {
      await assert.rejects(operationCase.run(new NodeFileSystem(), root), (error: unknown) => {
        assert.ok(error instanceof VirtualFileSystemError);
        assert.ok(Predicates.isObject(error.cause));
        assert.equal(error.cause.code, operationCase.expectedCauseCode);
        assert.equal(error.message, VirtualFileSystemError.toMessage(error.cause));
        return true;
      });
    });
  }
});
