import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import { JsonObject } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DrillDown, DrillDownConfigEntity, DrilldownRulesEntity } from '../../src/index.js';
import { TypeGuards } from '../../src/typeguards/index.js';
import scenarioCases from './DrilldownRulesEntity.scenarios.json' with { 'type': 'json' };
import { DrilldownRulesScenarioCaseEntity } from './entities/DrilldownRulesScenarioCaseEntity.js';

class DrilldownRulesRunners {
  static 'group-nested'(scenarioCase: ScenarioCaseOfType<DrilldownRulesScenarioCaseEntity.Type, 'group-nested'>): void {
    const records = DrilldownRulesRunners.buildRecords(scenarioCase.input.properties, scenarioCase.input.values);
    // `minimumGroupSize` alone proves the branded bound; `rules` is already `DrilldownRulesEntity.Type`,
    // validated separately above.
    const provenMinimumGroupSize = DrillDownConfigEntity.intake({ 'minimumGroupSize': 1 });
    const minimumGroupSize = provenMinimumGroupSize.minimumGroupSize;

    assert.ok(minimumGroupSize !== undefined, 'minimumGroupSize was just supplied to intake');

    const config: DrillDownConfigEntity.Type = {
      'minimumGroupSize': minimumGroupSize,
      'rules': DrilldownRulesRunners.buildPathRules(scenarioCase.input.properties, scenarioCase.input.values, scenarioCase.input.path, 0)
    };

    const drilldown = new DrillDown();
    let node = drilldown.group(records, config);

    const path = scenarioCase.input.path;
    for (let index = 0; index < path.length; index += 1) {
      const child = node.grouped?.[0];

      assert.ok(child !== undefined);
      assert.equal(child.value, path[index]);
      node = child;
    }

    assert.ok(node.grouped !== null && node.grouped !== undefined);
    assert.deepEqual(node.grouped.map((child) => {
      const value = child.value;
      return value;
    }), scenarioCase.expected.leafValues);
    assert.equal(node.grouped[0]?.ungrouped?.length, scenarioCase.expected.firstLeafUngroupedLength);
  }

  static 'validate-corrupted'(scenarioCase: ScenarioCaseOfType<DrilldownRulesScenarioCaseEntity.Type, 'validate-corrupted'>): void {
    const rules = DrilldownRulesRunners.buildNestedRules(scenarioCase.input.depth);
    let cursor = rules;

    for (let index = 0; index < scenarioCase.input.corruptAfter; index += 1) {
      cursor = cursor.group?.[0]?.values?.[0]?.rules ?? {};
    }
    const target = cursor.group?.[0];

    assert.ok(cursor.group !== undefined && target !== undefined, 'corruption target must exist');
    // The corrupted node gains an unknown member and loses its required `property`.
    Reflect.set(cursor.group, 0, { 'notAProperty': true, 'values': target.values });

    assert.equal(DrilldownRulesEntity.validate(rules), scenarioCase.expected.valid);
  }

  static 'validate-nested'(scenarioCase: ScenarioCaseOfType<DrilldownRulesScenarioCaseEntity.Type, 'validate-nested'>): void {
    const rules = DrilldownRulesRunners.buildNestedRules(scenarioCase.input.depth);

    assert.equal(DrilldownRulesEntity.validate(rules), scenarioCase.expected.valid);
  }

  /** Builds a `rules` tree nesting per-value rules `depth` levels deep, one string value per level. */
  private static buildNestedRules(depth: number): DrilldownRulesEntity.Type {
    let rules: DrilldownRulesEntity.Type = {};
    if (depth > 0) {
      rules = {
        'group': [{
          'property': `level${String(depth)}`,
          'values': [{ 'match': 'match', 'rules': DrilldownRulesRunners.buildNestedRules(depth - 1), 'type': 'string' }]
        }]
      };
    }
    return rules;
  }

  /** Builds a config whose per-value rules follow `path` one property per level. */
  private static buildPathRules(properties: readonly string[], values: readonly (readonly string[])[], path: readonly string[], level: number): DrilldownRulesEntity.Type {
    const property = properties[level] ?? '';
    let rules: DrilldownRulesEntity.Type = {};

    if (level >= path.length) {
      const leaf: { 'match': string; 'type': 'string' }[] = [];
      const column = values[level] ?? [];
      for (let index = 0; index < column.length; index += 1) {
        leaf.push({ 'match': String(column[index]), 'type': 'string' });
      }
      rules = { 'group': [{ 'property': property, 'values': leaf }] };
    } else {
      rules = {
        'group': [{
          'property': property,
          'values': [{
            'match': path[level] ?? '',
            'rules': DrilldownRulesRunners.buildPathRules(properties, values, path, level + 1),
            'type': 'string'
          }]
        }]
      };
    }

    return rules;
  }

  /** Builds the cartesian product of `values` as flat records keyed by `properties`. */
  private static buildRecords(properties: readonly string[], values: readonly (readonly string[])[]): Record<string, unknown>[] {
    let records: Record<string, unknown>[] = [{}];

    for (let index = 0; index < properties.length; index += 1) {
      const property = properties[index] ?? '';
      const column = values[index] ?? [];
      const next: Record<string, unknown>[] = [];

      for (let recordIndex = 0; recordIndex < records.length; recordIndex += 1) {
        const record = records[recordIndex] ?? {};
        for (let valueIndex = 0; valueIndex < column.length; valueIndex += 1) {
          next.push(JsonObject.fromEntries([...Object.entries(record), [property, column[valueIndex]]]));
        }
      }
      records = next;
    }

    return records;
  }
}

ScenarioSuite.register({
  'entity': DrilldownRulesScenarioCaseEntity,
  'file': scenarioCases,
  'name': 'DrilldownRulesEntity',
  'runners': DrilldownRulesRunners
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

    for (let index = 0; index < malformedRules.length; index += 1) {
      assert.equal(DrilldownRulesEntity.validate(malformedRules[index]), false);
    }
  });

  void it('uses canonical range entities as the only node-value proof', () => {
    const candidates: { 'guard': (value: unknown) => boolean, 'invalid': unknown, 'valid': unknown }[] = [
      { 'guard': TypeGuards.isAlphabeticRange, 'invalid': { 'end': 'm', 'start': 1 }, 'valid': { 'end': 'm', 'start': 'a' } },
      { 'guard': TypeGuards.isCidrRange, 'invalid': { 'cidr': 24 }, 'valid': { 'cidr': '10.0.0.0/24' } },
      { 'guard': TypeGuards.isDateRange, 'invalid': { 'after': '0', 'before': 1 }, 'valid': { 'after': 0, 'before': 1 } },
      { 'guard': TypeGuards.isRange, 'invalid': { 'maximum': 1, 'minimum': '0' }, 'valid': { 'maximum': 1, 'minimum': 0 } },
      { 'guard': TypeGuards.isSemverRange, 'invalid': { 'semver': 1 }, 'valid': { 'semver': '^1.0.0' } },
      { 'guard': TypeGuards.isSequentialRange, 'invalid': { 'maximum': 1, 'minimum': 0, 'padding': 2, 'prefix': 1 }, 'valid': { 'maximum': 1, 'minimum': 0, 'padding': 2, 'prefix': 'item-' } }
    ];

    for (let index = 0; index < candidates.length; index += 1) {
      const candidate = candidates[index];
      assert.ok(candidate !== undefined);
      assert.equal(candidate.guard(candidate.invalid), false);
      assert.equal(candidate.guard(candidate.valid), true);
    }
  });
});

void describe('DrillDownConfigEntity.rules cross-document reference', () => {
  void it('intake resolves nested rules against the real DrilldownRulesEntity shape', () => {
    const config = DrillDownConfigEntity.intake({
      'rules': {
        'group': [{ 'property': 'category', 'values': [{ 'end': 'm', 'start': 'a', 'type': 'alphabetic' }] }]
      }
    });

    assert.deepEqual(config.rules, {
      'group': [{ 'property': 'category', 'values': [{ 'end': 'm', 'start': 'a', 'type': 'alphabetic' }] }]
    });
  });

  void it('intake rejects rules whose nested group violates the referenced parent shape', () => {
    assert.throws(() => {
      DrillDownConfigEntity.intake({ 'rules': { 'group': 'not-an-array' } });
    });
  });
});
