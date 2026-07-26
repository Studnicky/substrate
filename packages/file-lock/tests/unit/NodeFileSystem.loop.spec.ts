import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { NodeFileSystem } from '../../src/NodeFileSystem.js';
import scenarioGroups from './NodeFileSystem.scenarios.json' with { type: 'json' };

type ScenarioCase = {
  description: string;
  expected: { forwarded: true };
  input: Record<string, never>;
  shape: 'forwards-file-system-operations';
  name: string;
};

void describe('NodeFileSystem', () => {
  for (const scenarioCase of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenarioCase.name, () => {
      assert.strictEqual(scenarioCase.shape, 'forwards-file-system-operations');

      const root = mkdtempSync(join(tmpdir(), 'file-lock-node-fs-'));
      const fs = new NodeFileSystem();
      try {
        const nested = join(root, 'nested');
        const file = join(nested, 'data.txt');

        assert.strictEqual(fs.existsSync(root), true);
        fs.mkdirSync(nested, { 'recursive': true });
        assert.deepStrictEqual(fs.readdirSync(root), ['nested']);
        fs.writeFileSync(file, 'hello', 'utf8');
        assert.strictEqual(fs.readFileSync(file, 'utf8'), 'hello');
        assert.ok(fs.statSync(file).isFile());

        const renamed = join(root, 'renamed.txt');
        fs.renameSync(file, renamed);
        assert.strictEqual(fs.existsSync(renamed), true);
        fs.unlinkSync(renamed);
        assert.strictEqual(fs.existsSync(renamed), false);

        writeFileSync(join(root, 'native.txt'), 'native');
        assert.strictEqual(readFileSync(join(root, 'native.txt'), 'utf8'), 'native');
        assert.strictEqual(scenarioCase.expected.forwarded, true);
      } finally {
        rmSync(root, { 'recursive': true, 'force': true });
      }
    });
  }
});
