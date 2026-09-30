import { RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import {
  join, resolve
} from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import scenarioGroups from './examples.scenarios.json' with { 'type': 'json' };

class ExampleModules {
  public static resolveRoot(): string {
    try {
      const currentDir = fileURLToPath(new URL('.', import.meta.url));
      const result = resolve(currentDir, '../../examples');

      return result;
    } catch (cause) {
      throw RuntimeError.create('Cannot resolve the examples root', { 'cause': cause });
    }
  }

  public static listFiles(examplesRoot: string): string[] {
    try {
      const entries = readdirSync(examplesRoot, { 'withFileTypes': true });
      const paths: string[] = [];

      for (let index = 0; index < entries.length; index++) {
        const entry = entries[index];

        if (entry !== undefined && entry.isFile() && entry.name.endsWith('.ts')) {
          paths.push(join(examplesRoot, entry.name));
        }
      }

      const result = paths.toSorted();

      return result;
    } catch (cause) {
      throw RuntimeError.create(`Cannot list examples in ${examplesRoot}`, { 'cause': cause });
    }
  }

  public static async verifyScenario(scenario: (typeof scenarioGroups.cases)[number], examplesRoot: string, exampleFiles: readonly string[]): Promise<void> {
    assert.equal(scenario.expected.importsWithoutThrow, true);
    assert.equal(scenario.input.examplesRoot, '../../examples');
    await ExampleModules.importAll(examplesRoot, exampleFiles);
  }

  public static async importAll(examplesRoot: string, exampleFiles: readonly string[]): Promise<void> {
    for (let index = 0; index < exampleFiles.length; index++) {
      const examplePath = exampleFiles[index];

      if (examplePath !== undefined) {
        const relPath = examplePath.replace(`${examplesRoot}/`, '');

        await assert.doesNotReject(async () => {
          await import(examplePath);
        }, `Example ${relPath} threw`);
      }
    }
  }
}

const examplesRoot = ExampleModules.resolveRoot();
const exampleFiles = ExampleModules.listFiles(examplesRoot);

assert.ok(exampleFiles.length > 0, 'Expected at least one example in examples/');

void describe('examples smoke', () => {
  for (let index = 0; index < scenarioGroups.cases.length; index++) {
    const scenario = scenarioGroups.cases[index];

    if (scenario !== undefined) {
      void it(scenario.name, async () => {
        await ExampleModules.verifyScenario(scenario, examplesRoot, exampleFiles);
      });
    }
  }
});
