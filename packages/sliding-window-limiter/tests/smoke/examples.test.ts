import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import {
  join, resolve
} from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  describe, it
} from 'node:test';

const currentDir = fileURLToPath(new URL('.', import.meta.url));
const examplesRoot = resolve(currentDir, '../../examples');

const exampleFiles = readdirSync(examplesRoot, { 'withFileTypes': true })
  .filter((entry) => {
    return entry.isFile() && entry.name.endsWith('.ts');
  })
  .map((entry) => {
    return join(examplesRoot, entry.name);
  })
  .sort();

assert.ok(exampleFiles.length > 0, 'Expected at least one example in examples/');

void describe('examples smoke', () => {
  for (const examplePath of exampleFiles) {
    const relPath = examplePath.replace(`${examplesRoot}/`, '');

    void it(`runs without throwing: ${relPath}`, async () => {
      await assert.doesNotReject(async () => {
        return await import(examplePath);
      }, `Example ${relPath} threw`);
    });
  }
});
