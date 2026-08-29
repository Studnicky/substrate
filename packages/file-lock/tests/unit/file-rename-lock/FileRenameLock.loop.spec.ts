import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { Predicates } from '@studnicky/types';

import { FileLockContentionError, FileRenameLock } from '../../../src/index.js';
import scenarioGroups from './FileRenameLock.scenarios.json' with { type: 'json' };

type AcquireReleaseScenarioCase = {
  readonly 'expected': { readonly 'existsAfterRelease': boolean; readonly 'existsWhileHeld': boolean };
  readonly 'input': { readonly 'content': string; readonly 'path': string };
  readonly 'name': string;
  readonly 'shape': 'acquire-release';
};

type ContentionScenarioCase = {
  readonly 'expected': Record<string, never>;
  readonly 'input': { readonly 'content': string; readonly 'path': string };
  readonly 'name': string;
  readonly 'shape': 'contention';
};

type ScenarioCase = AcquireReleaseScenarioCase | ContentionScenarioCase;

let testDirectory = '';

function requireBoolean(value: unknown, name: string): boolean {
  if (!Predicates.isBoolean(value)) {
    throw new TypeError(`${name} must be a boolean`);
  }
  return value;
}

function requireRecord(value: unknown, name: string): Record<string, unknown> {
  if (!Predicates.isObject(value)) {
    throw new TypeError(`${name} must be an object`);
  }
  return value;
}

function requireString(value: unknown, name: string): string {
  if (!Predicates.isString(value)) {
    throw new TypeError(`${name} must be a string`);
  }
  return value;
}

function parseScenarioCase(value: unknown): ScenarioCase {
  const record = requireRecord(value, 'scenario case');
  const input = requireRecord(record['input'], 'scenario input');
  const name = requireString(record['name'], 'scenario name');
  const shape = requireString(record['shape'], 'scenario shape');
  const expected = requireRecord(record['expected'], 'scenario expected');
  const normalizedInput = {
    'content': requireString(input['content'], 'scenario input content'),
    'path': requireString(input['path'], 'scenario input path')
  };

  if (shape === 'acquire-release') {
    return {
      'expected': {
        'existsAfterRelease': requireBoolean(expected['existsAfterRelease'], 'scenario expected existsAfterRelease'),
        'existsWhileHeld': requireBoolean(expected['existsWhileHeld'], 'scenario expected existsWhileHeld')
      },
      'input': normalizedInput,
      'name': name,
      'shape': shape
    };
  }

  if (shape === 'contention') {
    return {
      'expected': {},
      'input': normalizedInput,
      'name': name,
      'shape': shape
    };
  }

  throw new TypeError(`Unknown FileRenameLock scenario shape: ${shape}`);
}

function parseScenarioCases(value: unknown): readonly ScenarioCase[] {
  const record = requireRecord(value, 'scenario groups');
  const cases = record['cases'];
  if (!Predicates.isArray(cases)) {
    throw new TypeError('scenario groups cases must be an array');
  }
  const result: ScenarioCase[] = [];
  for (const scenarioCase of cases) {
    result.push(parseScenarioCase(scenarioCase));
  }
  return result;
}

const scenarioCases = parseScenarioCases(scenarioGroups);

beforeEach(() => {
  testDirectory = mkdtempSync(join(tmpdir(), 'file-rename-lock-tests-'));
});

afterEach(() => {
  rmSync(testDirectory, { 'force': true, 'recursive': true });
});

void describe('FileRenameLock', () => {
  for (const scenarioCase of scenarioCases) {
    void it(scenarioCase.name, () => {
      const path = join(testDirectory, scenarioCase.input.path);
      writeFileSync(path, scenarioCase.input.content);

      switch (scenarioCase.shape) {
        case 'acquire-release': {
          const lock = FileRenameLock.create({ path });
          lock.acquire();
          assert.equal(existsSync(path), scenarioCase.expected.existsWhileHeld);
          lock.release();
          assert.equal(existsSync(path), scenarioCase.expected.existsAfterRelease);
          return;
        }
        case 'contention': {
          const heldLock = FileRenameLock.create({ path });
          heldLock.acquire();
          const contender = FileRenameLock.create({ path });
          assert.throws(() => { contender.acquire(); }, FileLockContentionError);
          heldLock.release();
          return;
        }
      }
    });
  }
});
