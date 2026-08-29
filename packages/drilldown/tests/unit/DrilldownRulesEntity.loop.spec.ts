import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Predicates } from '@studnicky/types';

import type { DataRecordInterface, DrillDownConfigEntity } from '../../src/index.js';

import { DrilldownRulesEntity, DrillDown } from '../../src/index.js';
import scenarioCases from './DrilldownRulesEntity.scenarios.json' with { type: 'json' };

type ScenarioCase =
  | { description: string; expected: { valid: boolean }; input: { depth: number }; name: string; shape: 'validate-nested' }
  | { description: string; expected: { valid: boolean }; input: { corruptAfter: number; depth: number }; name: string; shape: 'validate-corrupted' }
  | {
      description: string;
      expected: { firstLeafUngroupedLength: number; leafValues: string[] };
      input: { path: string[]; properties: string[]; values: string[][] };
      name: string;
      shape: 'group-nested';
    };

function requireBoolean(value: unknown, path: string): boolean {
  assert.ok(Predicates.isBoolean(value), `${path} must be a boolean`);
  return value;
}

function requireInteger(value: unknown, path: string): number {
  assert.ok(Predicates.isNumber(value), `${path} must be a number`);
  assert.ok(Number.isInteger(value), `${path} must be an integer`);
  return value;
}

function requireRecord(value: unknown, path: string): Record<string, unknown> {
  assert.ok(Predicates.isRecord(value), `${path} must be an object`);
  return value;
}

function requireString(value: unknown, path: string): string {
  assert.ok(Predicates.isString(value), `${path} must be a string`);
  return value;
}

function requireStringArray(value: unknown, path: string): string[] {
  assert.ok(Predicates.isArray(value), `${path} must be an array`);
  return value.map((entry, index) => { return requireString(entry, `${path}[${index}]`); });
}

function requireStringMatrix(value: unknown, path: string): string[][] {
  assert.ok(Predicates.isArray(value), `${path} must be an array`);
  return value.map((entry, index) => { return requireStringArray(entry, `${path}[${index}]`); });
}

function parseScenarioCase(value: unknown, index: number): ScenarioCase {
  const path = `scenario[${index}]`;
  const scenario = requireRecord(value, path);
  const name = requireString(scenario.name, `${path}.name`);
  const description = requireString(scenario.description, `${path}.description`);
  const shape = requireString(scenario.shape, `${path}.shape`);
  const input = requireRecord(scenario.input, `${path}.input`);
  const expected = requireRecord(scenario.expected, `${path}.expected`);

  if (shape === 'validate-nested') {
    return {
      'description': description,
      'expected': { 'valid': requireBoolean(expected.valid, `${path}.expected.valid`) },
      'input': { 'depth': requireInteger(input.depth, `${path}.input.depth`) },
      'name': name,
      'shape': shape
    };
  }

  if (shape === 'validate-corrupted') {
    return {
      'description': description,
      'expected': { 'valid': requireBoolean(expected.valid, `${path}.expected.valid`) },
      'input': {
        'corruptAfter': requireInteger(input.corruptAfter, `${path}.input.corruptAfter`),
        'depth': requireInteger(input.depth, `${path}.input.depth`)
      },
      'name': name,
      'shape': shape
    };
  }

  assert.equal(shape, 'group-nested', `${path}.shape is not supported`);

  return {
    'description': description,
    'expected': {
      'firstLeafUngroupedLength': requireInteger(expected.firstLeafUngroupedLength, `${path}.expected.firstLeafUngroupedLength`),
      'leafValues': requireStringArray(expected.leafValues, `${path}.expected.leafValues`)
    },
    'input': {
      'path': requireStringArray(input.path, `${path}.input.path`),
      'properties': requireStringArray(input.properties, `${path}.input.properties`),
      'values': requireStringMatrix(input.values, `${path}.input.values`)
    },
    'name': name,
    'shape': shape
  };
}

function parseScenarioCases(value: unknown): ScenarioCase[] {
  assert.ok(Predicates.isArray(value), 'scenario fixture must be an array');
  return value.map(parseScenarioCase);
}

/** Builds a `rules` tree nesting per-value rules `depth` levels deep, one string value per level. */
function buildNestedRules(depth: number): DrilldownRulesEntity.Type {
  if (depth === 0) {
    return {};
  }

  return {
    'group': [{
      'property': `level${depth}`,
      'values': [{ 'match': 'match', 'rules': buildNestedRules(depth - 1), 'type': 'string' }]
    }]
  };
}

/** Builds the cartesian product of `values` as flat records keyed by `properties`. */
function buildRecords(properties: readonly string[], values: readonly string[][]): DataRecordInterface[] {
  let records: DataRecordInterface[] = [{}];

  for (let index = 0; index < properties.length; index += 1) {
    const property = properties[index] ?? '';
    const column = values[index] ?? [];
    const next: DataRecordInterface[] = [];

    for (const record of records) {
      for (const value of column) {
        next.push({ ...record, [property]: value });
      }
    }
    records = next;
  }

  return records;
}

/** Builds a config whose per-value rules follow `path` one property per level. */
function buildPathRules(properties: readonly string[], values: readonly string[][], path: readonly string[], level: number): DrilldownRulesEntity.Type {
  const property = properties[level] ?? '';

  if (level >= path.length) {
    const leaf = (values[level] ?? []).map((value): { 'match': string; 'type': 'string' } => {
      return { 'match': value, 'type': 'string' };
    });

    return { 'group': [{ 'property': property, 'values': leaf }] };
  }

  return {
    'group': [{
      'property': property,
      'values': [{
        'match': path[level] ?? '',
        'rules': buildPathRules(properties, values, path, level + 1),
        'type': 'string'
      }]
    }]
  };
}

function runScenarioCase(scenarioCase: ScenarioCase): void {
  if (scenarioCase.shape === 'validate-nested') {
    const rules = buildNestedRules(scenarioCase.input.depth);

    assert.equal(DrilldownRulesEntity.validate(rules), scenarioCase.expected.valid);
    return;
  }

  if (scenarioCase.shape === 'validate-corrupted') {
    const rules = buildNestedRules(scenarioCase.input.depth);
    let cursor = rules;

    for (let index = 0; index < scenarioCase.input.corruptAfter; index += 1) {
      cursor = cursor.group?.[0]?.values?.[0]?.rules ?? {};
    }
    const target = cursor.group?.[0];

    assert.ok(target !== undefined, 'corruption target must exist');
    Reflect.set(target, 'notAProperty', true);
    Reflect.deleteProperty(target, 'property');

    assert.equal(DrilldownRulesEntity.validate(rules), scenarioCase.expected.valid);
    return;
  }

  const records = buildRecords(scenarioCase.input.properties, scenarioCase.input.values);
  const config: DrillDownConfigEntity.Type = {
    'minimumGroupSize': 0,
    'rules': buildPathRules(scenarioCase.input.properties, scenarioCase.input.values, scenarioCase.input.path, 0)
  };

  const drilldown = new DrillDown();
  let node = drilldown.group(records, config);

  for (const step of scenarioCase.input.path) {
    const child = node.grouped?.[0];

    assert.ok(child !== undefined);
    assert.equal(child.value, step);
    node = child;
  }

  assert.ok(node.grouped !== null && node.grouped !== undefined);
  assert.deepEqual(node.grouped.map((child) => { return child.value; }), scenarioCase.expected.leafValues);
  assert.equal(node.grouped[0]?.ungrouped?.length, scenarioCase.expected.firstLeafUngroupedLength);
}

void describe('DrilldownRulesEntity', () => {
  for (const scenarioCase of parseScenarioCases(scenarioCases)) {
    void it(`${scenarioCase.name}: ${scenarioCase.description}`, () => {
      runScenarioCase(scenarioCase);
    });
  }
});
