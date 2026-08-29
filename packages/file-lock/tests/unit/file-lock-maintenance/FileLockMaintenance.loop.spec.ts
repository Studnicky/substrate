import { RuntimeError } from '@studnicky/errors';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { Predicates } from '@studnicky/types';

import { FileLockInspection, FileLockRecovery, FileLockRecoveryConflictError, NodeOwnerLiveness } from '../../../src/index.js';
import scenarioGroups from './FileLockMaintenance.scenarios.json' with { type: 'json' };

type ConflictAndLivenessScenarioCase = {
  readonly 'expected': { readonly 'invalidOwnerIsAlive': boolean; readonly 'processIsAlive': boolean };
  readonly 'input': { readonly 'content': string; readonly 'ownerToken': string; readonly 'path': string };
  readonly 'name': string;
  readonly 'shape': 'conflict-and-liveness';
};

type InspectScenarioCase = {
  readonly 'expected': { readonly 'lockPaths': readonly string[] };
  readonly 'input': { readonly 'ownerTokens': readonly string[]; readonly 'path': string };
  readonly 'name': string;
  readonly 'shape': 'inspect';
};

type RestoreScenarioCase = {
  readonly 'expected': { readonly 'content': string };
  readonly 'input': { readonly 'content': string; readonly 'ownerToken': string; readonly 'path': string };
  readonly 'name': string;
  readonly 'shape': 'restore';
};

type ScenarioCase = ConflictAndLivenessScenarioCase | InspectScenarioCase | RestoreScenarioCase;

let testDirectory = '';

function requireBoolean(value: unknown, name: string): boolean {
  if (!Predicates.isBoolean(value)) {
    throw RuntimeError.create(`${name} must be a boolean`);
  }
  return value;
}

function requireRecord(value: unknown, name: string): Record<string, unknown> {
  if (!Predicates.isObject(value)) {
    throw RuntimeError.create(`${name} must be an object`);
  }
  return value;
}

function requireString(value: unknown, name: string): string {
  if (!Predicates.isString(value)) {
    throw RuntimeError.create(`${name} must be a string`);
  }
  return value;
}

function requireStringArray(value: unknown, name: string): readonly string[] {
  if (!Predicates.isArray(value)) {
    throw RuntimeError.create(`${name} must be an array`);
  }
  const result: string[] = [];
  for (const item of value) {
    result.push(requireString(item, name));
  }
  return result;
}

function parseLockInput(value: Record<string, unknown>): { readonly 'content': string; readonly 'ownerToken': string; readonly 'path': string } {
  return {
    'content': requireString(value['content'], 'scenario input content'),
    'ownerToken': requireString(value['ownerToken'], 'scenario input ownerToken'),
    'path': requireString(value['path'], 'scenario input path')
  };
}

function parseScenarioCase(value: unknown): ScenarioCase {
  const record = requireRecord(value, 'scenario case');
  const expected = requireRecord(record['expected'], 'scenario expected');
  const input = requireRecord(record['input'], 'scenario input');
  const name = requireString(record['name'], 'scenario name');
  const shape = requireString(record['shape'], 'scenario shape');

  if (shape === 'inspect') {
    return {
      'expected': { 'lockPaths': requireStringArray(expected['lockPaths'], 'scenario expected lockPaths') },
      'input': {
        'ownerTokens': requireStringArray(input['ownerTokens'], 'scenario input ownerTokens'),
        'path': requireString(input['path'], 'scenario input path')
      },
      'name': name,
      'shape': shape
    };
  }

  if (shape === 'restore') {
    return {
      'expected': { 'content': requireString(expected['content'], 'scenario expected content') },
      'input': parseLockInput(input),
      'name': name,
      'shape': shape
    };
  }

  if (shape === 'conflict-and-liveness') {
    return {
      'expected': {
        'invalidOwnerIsAlive': requireBoolean(expected['invalidOwnerIsAlive'], 'scenario expected invalidOwnerIsAlive'),
        'processIsAlive': requireBoolean(expected['processIsAlive'], 'scenario expected processIsAlive')
      },
      'input': parseLockInput(input),
      'name': name,
      'shape': shape
    };
  }

  throw RuntimeError.create(`Unknown file lock maintenance scenario shape: ${shape}`);
}

function parseScenarioCases(value: unknown): readonly ScenarioCase[] {
  const record = requireRecord(value, 'scenario groups');
  const cases = record['cases'];
  if (!Predicates.isArray(cases)) {
    throw RuntimeError.create('scenario groups cases must be an array');
  }
  const result: ScenarioCase[] = [];
  for (const scenarioCase of cases) {
    result.push(parseScenarioCase(scenarioCase));
  }
  return result;
}

const scenarioCases = parseScenarioCases(scenarioGroups);

beforeEach(() => {
  testDirectory = mkdtempSync(join(tmpdir(), 'file-lock-maintenance-tests-'));
});

afterEach(() => {
  rmSync(testDirectory, { 'force': true, 'recursive': true });
});

void describe('FileLock maintenance primitives', () => {
  for (const scenarioCase of scenarioCases) {
    void it(scenarioCase.name, () => {
      const path = join(testDirectory, scenarioCase.input.path);

      switch (scenarioCase.shape) {
        case 'inspect': {
          for (const ownerToken of scenarioCase.input.ownerTokens) {
            writeFileSync(`${path}.lock.${ownerToken}`, ownerToken);
          }
          const inspections = FileLockInspection.inspect({ path });
          assert.deepEqual(inspections.map((inspection) => inspection.lockPath.slice(testDirectory.length + 1)), scenarioCase.expected.lockPaths);
          return;
        }
        case 'restore': {
          const lockPath = `${path}.lock.${scenarioCase.input.ownerToken}`;
          writeFileSync(path, scenarioCase.input.content);
          renameSync(path, lockPath);
          const inspection = FileLockInspection.inspect({ path }).at(0);
          assert.ok(inspection !== undefined);
          FileLockRecovery.restore({ inspection });
          assert.equal(existsSync(path), true);
          assert.equal(readFileSync(path, 'utf8'), scenarioCase.expected.content);
          return;
        }
        case 'conflict-and-liveness': {
          const lockPath = `${path}.lock.${scenarioCase.input.ownerToken}`;
          writeFileSync(path, scenarioCase.input.content);
          writeFileSync(lockPath, scenarioCase.input.content);
          const inspection = FileLockInspection.inspect({ path }).at(0);
          assert.ok(inspection !== undefined);
          assert.throws(() => { FileLockRecovery.restore({ inspection }); }, FileLockRecoveryConflictError);
          const liveness = new NodeOwnerLiveness();
          assert.equal(liveness.isAlive(`${process.pid}`), scenarioCase.expected.processIsAlive);
          assert.equal(liveness.isAlive('not-a-process-id'), scenarioCase.expected.invalidOwnerIsAlive);
          return;
        }
      }
    });
  }
});
