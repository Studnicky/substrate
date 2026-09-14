import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Predicates } from '@studnicky/types/node';

import type { DrillDownConfigEntity } from '../../src/index.js';

import { DrilldownRulesEntity, DrillDown } from '../../src/index.js';
import { TypeGuards } from '../../src/typeguards/index.js';
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
function buildRecords(properties: readonly string[], values: readonly string[][]): Record<string, unknown>[] {
  let records: Record<string, unknown>[] = [{}];

  for (let index = 0; index < properties.length; index += 1) {
    const property = properties[index] ?? '';
    const column = values[index] ?? [];
    const next: Record<string, unknown>[] = [];

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

void describe('schema-owned group values', () => {
  void it('accepts every schema-defined group-value branch', () => {
    const rules: unknown = {
      'group': [{
        'property': 'category',
        'values': [
          { 'end': 'm', 'start': 'a', 'type': 'alphabetic' },
          { 'cidr': '10.0.0.0/24', 'type': 'cidr' },
          { 'after': 0, 'before': 1, 'type': 'date' },
          { 'maximum': 10, 'minimum': 0, 'type': 'range' },
          { 'semver': '^1.0.0', 'type': 'semver' },
          { 'sequential': { 'maximum': 10, 'minimum': 0, 'padding': 2, 'prefix': 'item-' }, 'type': 'sequential' },
          { 'match': 'active', 'type': 'string' }
        ]
      }]
    };

    assert.equal(DrilldownRulesEntity.validate(rules), true);
  });

  void it('rejects malformed discriminator-shaped group values', () => {
    const malformedRules: unknown[] = [
      { 'group': [{ 'property': 'category', 'values': [{ 'end': 'm', 'start': 1, 'type': 'alphabetic' }] }] },
      { 'group': [{ 'property': 'category', 'values': [{ 'cidr': 24, 'type': 'cidr' }] }] },
      { 'group': [{ 'property': 'category', 'values': [{ 'after': '0', 'before': 1, 'type': 'date' }] }] },
      { 'group': [{ 'property': 'category', 'values': [{ 'maximum': 10, 'minimum': '0', 'type': 'range' }] }] },
      { 'group': [{ 'property': 'category', 'values': [{ 'semver': 1, 'type': 'semver' }] }] },
      { 'group': [{ 'property': 'category', 'values': [{ 'sequential': { 'maximum': 10, 'minimum': 0, 'padding': 2, 'prefix': 1 }, 'type': 'sequential' }] }] },
      { 'group': [{ 'property': 'category', 'values': [{ 'match': 1, 'type': 'string' }] }] }
    ];

    for (const rules of malformedRules) {
      assert.equal(DrilldownRulesEntity.validate(rules), false);
    }
  });

  void it('uses canonical range entities as the only node-value proof', () => {
    const candidates: Array<{ 'guard': (value: unknown) => boolean, 'invalid': unknown, 'valid': unknown }> = [
      { 'guard': TypeGuards.isAlphabeticRange, 'invalid': { 'end': 'm', 'start': 1 }, 'valid': { 'end': 'm', 'start': 'a' } },
      { 'guard': TypeGuards.isCidrRange, 'invalid': { 'cidr': 24 }, 'valid': { 'cidr': '10.0.0.0/24' } },
      { 'guard': TypeGuards.isDateRange, 'invalid': { 'after': '0', 'before': 1 }, 'valid': { 'after': 0, 'before': 1 } },
      { 'guard': TypeGuards.isRange, 'invalid': { 'maximum': 1, 'minimum': '0' }, 'valid': { 'maximum': 1, 'minimum': 0 } },
      { 'guard': TypeGuards.isSemverRange, 'invalid': { 'semver': 1 }, 'valid': { 'semver': '^1.0.0' } },
      { 'guard': TypeGuards.isSequentialRange, 'invalid': { 'maximum': 1, 'minimum': 0, 'padding': 2, 'prefix': 1 }, 'valid': { 'maximum': 1, 'minimum': 0, 'padding': 2, 'prefix': 'item-' } }
    ];

    for (const candidate of candidates) {
      assert.equal(candidate.guard(candidate.invalid), false);
      assert.equal(candidate.guard(candidate.valid), true);
    }
  });
});
