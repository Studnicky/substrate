import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import {
  join, resolve
} from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import scenarioGroups from './examples.scenarios.json' with { type: 'json' };

const currentDir = fileURLToPath(new URL('.', import.meta.url));
const examplesRoot = resolve(currentDir, '../../examples');

const exampleFiles = readdirSync(examplesRoot, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
  .map((entry) => join(examplesRoot, entry.name))
  .sort();

assert.ok(exampleFiles.length > 0, 'Expected at least one example in examples/');

type ScenarioCase = {
  description: string;
  expected: { importsWithoutThrow: true };
  input: { examplesRoot: string };
  shape: 'examples-smoke';
  name: string;
};

void describe('examples smoke', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      assert.equal(scenario.expected.importsWithoutThrow, true);
      assert.equal(scenario.input.examplesRoot, '../../examples');
      for (const examplePath of exampleFiles) {
        const relPath = examplePath.replace(`${examplesRoot}/`, '');
        await assert.doesNotReject(async () => {
          await import(examplePath);
        }, `Example ${relPath} threw`);
      }
    });
  }
});
