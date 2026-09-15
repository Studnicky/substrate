import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdirSync, mkdtempSync, rmSync, writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  describe, it
} from 'node:test';

const REPOSITORY_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const CHECKER_PATH = join(REPOSITORY_ROOT, 'scripts', 'check-docs-demos.mjs');

function writeFixtureFile(root: string, relativePath: string, content: string): void {
  const filePath = join(root, relativePath);
  mkdirSync(join(filePath, '..'), { 'recursive': true });
  writeFileSync(filePath, content);
}

void describe('docs runnable demo registry', () => {
  void it('rejects a runnable source that exists on disk but has no ExampleSources loader', () => {
    const root = mkdtempSync(join(tmpdir(), 'substrate-docs-demo-'));

    try {
      writeFixtureFile(root, 'packages/demo/package.json', '{}');
      writeFixtureFile(root, 'packages/demo/examples/browserDemo.ts', "console.log('demo');");
      writeFixtureFile(root, 'docs/packages/demo.md', '<RunnableExample src="packages/demo/examples/browserDemo" />');
      writeFixtureFile(root, 'docs/.vitepress/theme/utils/ExampleSourcePaths.json', '[]');

      const result = spawnSync(process.execPath, [CHECKER_PATH, '--root', root], { 'encoding': 'utf8' });

      assert.equal(result.status, 1);
      assert.match(result.stderr, /without an ExampleSources loader/u);
    } finally {
      rmSync(root, { 'force': true, 'recursive': true });
    }
  });
});
