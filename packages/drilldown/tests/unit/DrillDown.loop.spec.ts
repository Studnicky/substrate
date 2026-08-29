import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Predicates } from '@studnicky/types';

import type { DataRecordInterface, DrillDownConfigEntity, GroupNodeInterface } from '../../src/index.js';

import { DrillDown } from '../../src/index.js';
import scenarioGroups from './DrillDown.scenarios.json' with { type: 'json' };

type JsonRecord = Record<string, unknown>;
type ScenarioCase =
  | { readonly description: string; readonly expected: { readonly childCount: number; readonly leafCounts: readonly number[]; readonly values: readonly string[] }; readonly input: { readonly config: string; readonly fixture: string }; readonly name: string; readonly shape: 'group' }
  | { readonly description: string; readonly expected: { readonly grouped: null; readonly ungrouped: readonly never[] }; readonly input: { readonly config: string; readonly fixture: string }; readonly name: string; readonly shape: 'group-empty' }
  | { readonly description: string; readonly expected: { readonly identical: boolean }; readonly input: { readonly config: string; readonly fixture: string }; readonly name: string; readonly shape: 'deterministic-group' }
  | { readonly description: string; readonly expected: { readonly identical: boolean }; readonly input: { readonly fixture: string }; readonly name: string; readonly shape: 'deterministic-analyze' };

interface ScenarioGroups {
  readonly cases: readonly ScenarioCase[];
  readonly configs: ReadonlyMap<string, DrillDownConfigEntity.Type>;
  readonly fixtures: ReadonlyMap<string, readonly DataRecordInterface[]>;
}

function requireRecord(value: unknown): JsonRecord {
  assert.ok(Predicates.isRecord(value));
  return value;
}

function requireValue(record: JsonRecord, key: string): unknown {
  assert.ok(Object.hasOwn(record, key));
  return Reflect.get(record, key);
}

function requireString(value: unknown): string {
  assert.ok(Predicates.isString(value));
  return value;
}

function requireNumber(value: unknown): number {
  assert.ok(Predicates.isFiniteNumber(value));
  return value;
}

function requireBoolean(value: unknown): boolean {
  assert.ok(Predicates.isBoolean(value));
  return value;
}

function requireArray(value: unknown): readonly unknown[] {
  assert.ok(Predicates.isArray(value));
  return value;
}

function requireStringArray(value: unknown): string[] {
  return requireArray(value).map(requireString);
}

function requireNumberArray(value: unknown): number[] {
  return requireArray(value).map(requireNumber);
}

interface StringGroupValue {
  readonly match: string;
  readonly type: 'string';
}

interface GroupRule {
  readonly property: string;
  readonly values: StringGroupValue[];
}

interface ExcludeValueFilter {
  readonly operator: 'exclude';
  readonly property: string;
  readonly type: 'value';
  readonly values: string[];
}

function parseStringGroupValue(value: unknown): StringGroupValue {
  const stringValue = requireRecord(value);
  assert.equal(requireString(requireValue(stringValue, 'type')), 'string');
  return { 'match': requireString(requireValue(stringValue, 'match')), 'type': 'string' };
}

function parseGroupRule(value: unknown): GroupRule {
  const groupRule = requireRecord(value);
  return { 'property': requireString(requireValue(groupRule, 'property')), 'values': requireArray(requireValue(groupRule, 'values')).map(parseStringGroupValue) };
}

function parseExcludeValueFilter(value: unknown): ExcludeValueFilter {
  const valueFilter = requireRecord(value);
  assert.equal(requireString(requireValue(valueFilter, 'operator')), 'exclude');
  assert.equal(requireString(requireValue(valueFilter, 'type')), 'value');
  return { 'operator': 'exclude', 'property': requireString(requireValue(valueFilter, 'property')), 'type': 'value', 'values': requireStringArray(requireValue(valueFilter, 'values')) };
}

function parseConfig(value: unknown): DrillDownConfigEntity.Type {
  const record = requireRecord(value);
  const rules = requireRecord(requireValue(record, 'rules'));
  const group = requireArray(requireValue(rules, 'group')).map(parseGroupRule);
  const parsed: DrillDownConfigEntity.Type = { 'minimumGroupSize': requireNumber(requireValue(record, 'minimumGroupSize')), 'rules': { 'group': group } };
  if (Object.hasOwn(record, 'filter')) {
    const filters = requireArray(requireValue(record, 'filter')).map(parseExcludeValueFilter);
    return { ...parsed, 'filter': filters };
  }
  return parsed;
}

function parseScenario(value: unknown): ScenarioCase {
  const record = requireRecord(value);
  const input = requireRecord(requireValue(record, 'input'));
  const expected = requireRecord(requireValue(record, 'expected'));
  const description = requireString(requireValue(record, 'description'));
  const name = requireString(requireValue(record, 'name'));
  const shape = requireString(requireValue(record, 'shape'));
  if (shape === 'group') return { 'description': description, 'expected': { 'childCount': requireNumber(requireValue(expected, 'childCount')), 'leafCounts': requireNumberArray(requireValue(expected, 'leafCounts')), 'values': requireStringArray(requireValue(expected, 'values')) }, 'input': { 'config': requireString(requireValue(input, 'config')), 'fixture': requireString(requireValue(input, 'fixture')) }, 'name': name, 'shape': shape };
  if (shape === 'group-empty') {
    assert.equal(requireValue(expected, 'grouped'), null);
    assert.equal(requireArray(requireValue(expected, 'ungrouped')).length, 0);
    return { 'description': description, 'expected': { 'grouped': null, 'ungrouped': [] }, 'input': { 'config': requireString(requireValue(input, 'config')), 'fixture': requireString(requireValue(input, 'fixture')) }, 'name': name, 'shape': shape };
  }
  if (shape === 'deterministic-group') return { 'description': description, 'expected': { 'identical': requireBoolean(requireValue(expected, 'identical')) }, 'input': { 'config': requireString(requireValue(input, 'config')), 'fixture': requireString(requireValue(input, 'fixture')) }, 'name': name, 'shape': shape };
  if (shape === 'deterministic-analyze') return { 'description': description, 'expected': { 'identical': requireBoolean(requireValue(expected, 'identical')) }, 'input': { 'fixture': requireString(requireValue(input, 'fixture')) }, 'name': name, 'shape': shape };
  assert.fail(`Unknown DrillDown scenario shape: ${shape}`);
}

function parseScenarioGroups(value: unknown): ScenarioGroups {
  const root = requireRecord(value);
  const fixtures = new Map<string, readonly DataRecordInterface[]>();
  for (const [name, values] of Object.entries(requireRecord(requireValue(root, 'fixtures')))) {
    fixtures.set(name, requireArray(values).map(requireRecord));
  }
  const configs = new Map<string, DrillDownConfigEntity.Type>();
  for (const [name, config] of Object.entries(requireRecord(requireValue(root, 'configs')))) {
    configs.set(name, parseConfig(config));
  }
  return { 'cases': requireArray(requireValue(root, 'cases')).map(parseScenario), 'configs': configs, 'fixtures': fixtures };
}

function recordsFor(fixtures: ReadonlyMap<string, readonly DataRecordInterface[]>, name: string): readonly DataRecordInterface[] {
  const records = fixtures.get(name);
  assert.ok(records !== undefined, `No fixture named '${name}'`);
  return records;
}

function configFor(configs: ReadonlyMap<string, DrillDownConfigEntity.Type>, name: string): DrillDownConfigEntity.Type {
  const config = configs.get(name);
  assert.ok(config !== undefined, `No config named '${name}'`);
  return config;
}

function leafRecordCounts(node: GroupNodeInterface): number[] {
  return node.grouped === null ? [node.ungrouped?.length ?? 0] : node.grouped.flatMap(leafRecordCounts);
}

function runScenario(groups: ScenarioGroups, scenarioCase: ScenarioCase): void {
  const drilldown = new DrillDown();
  if (scenarioCase.shape === 'group') {
    const tree = drilldown.group([...recordsFor(groups.fixtures, scenarioCase.input.fixture)], configFor(groups.configs, scenarioCase.input.config));
    assert.ok(tree.grouped !== null);
    assert.equal(tree.grouped.length, scenarioCase.expected.childCount);
    assert.deepEqual(tree.grouped.map((child) => { return child.value; }), scenarioCase.expected.values);
    assert.deepEqual(leafRecordCounts(tree), scenarioCase.expected.leafCounts);
    return;
  }
  if (scenarioCase.shape === 'group-empty') {
    const tree = drilldown.group([...recordsFor(groups.fixtures, scenarioCase.input.fixture)], configFor(groups.configs, scenarioCase.input.config));
    assert.equal(tree.grouped, scenarioCase.expected.grouped);
    assert.deepEqual(tree.ungrouped, scenarioCase.expected.ungrouped);
    return;
  }
  if (scenarioCase.shape === 'deterministic-group') {
    const records = [...recordsFor(groups.fixtures, scenarioCase.input.fixture)];
    const config = configFor(groups.configs, scenarioCase.input.config);
    const first = drilldown.group(records, config);
    const second = drilldown.group(records, config);
    assert.equal(JSON.stringify(first) === JSON.stringify(second), scenarioCase.expected.identical);
    assert.deepEqual(first, second);
    return;
  }
  const records = [...recordsFor(groups.fixtures, scenarioCase.input.fixture)];
  const first = drilldown.analyze(records);
  const second = drilldown.analyze(records);
  assert.deepEqual(first.selectedGrouping, second.selectedGrouping);
  assert.deepEqual(first.recommendedGrouping, second.recommendedGrouping);
  assert.equal(scenarioCase.expected.identical, true);
}

const parsedScenarioGroups = parseScenarioGroups(scenarioGroups);

void describe('DrillDown', () => {
  for (const scenarioCase of parsedScenarioGroups.cases) {
    void it(`${scenarioCase.name}: ${scenarioCase.description}`, () => {
      runScenario(parsedScenarioGroups, scenarioCase);
    });
  }
});
