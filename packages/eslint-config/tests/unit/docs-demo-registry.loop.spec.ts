import { RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdirSync, mkdtempSync, rmSync, writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  describe, it
} from 'node:test';

class DocsDemoFixture {
  static readonly 'checkerPath': string = join(resolve(import.meta.dirname, '../../../..'), 'scripts', 'check-docs-demos.ts');

  static createRoot(): string {
    try {
      const root = mkdtempSync(join(tmpdir(), 'substrate-docs-demo-'));

      return root;
    } catch (cause) {
      throw RuntimeError.create('Cannot create the docs demo fixture root', { 'cause': cause });
    }
  }

  static removeRoot(root: string): void {
    try {
      rmSync(root, { 'force': true, 'recursive': true });
    } catch (cause) {
      throw RuntimeError.create(`Cannot remove ${root}`, { 'cause': cause });
    }
  }

  static runChecker(root: string): { 'status': number | null; 'stderr': string } {
    try {
      const result = spawnSync(process.execPath, [DocsDemoFixture.checkerPath, '--root', root], { 'encoding': 'utf8' });

      return { 'status': result.status, 'stderr': result.stderr };
    } catch (cause) {
      throw RuntimeError.create(`Cannot run the docs demo checker against ${root}`, { 'cause': cause });
    }
  }

  static writeFixtureFile(root: string, relativePath: string, content: string): void {
    const filePath = join(root, relativePath);

    try {
      mkdirSync(join(filePath, '..'), { 'recursive': true });
      writeFileSync(filePath, content);
    } catch (cause) {
      throw RuntimeError.create(`Cannot write ${filePath}`, { 'cause': cause });
    }
  }
}

void describe('docs runnable demo registry', () => {
  void it('rejects a runnable source that exists on disk but has no ExampleSources loader', () => {
    const root = DocsDemoFixture.createRoot();

    try {
      DocsDemoFixture.writeFixtureFile(root, 'packages/demo/package.json', '{}');
      DocsDemoFixture.writeFixtureFile(root, 'packages/demo/examples/browserDemo.ts', "console.log('demo');");
      DocsDemoFixture.writeFixtureFile(root, 'docs/packages/demo.md', '<RunnableExample src="packages/demo/examples/browserDemo" />');
      DocsDemoFixture.writeFixtureFile(root, 'docs/.vitepress/theme/utils/ExampleSourcePaths.json', '[]');

      const result = DocsDemoFixture.runChecker(root);

      assert.equal(result.status, 1);
      assert.ok(result.stderr.includes('without an ExampleSources loader'));
    } finally {
      DocsDemoFixture.removeRoot(root);
    }
  });
});
