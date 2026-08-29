import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Predicates } from '@studnicky/types';

import type { DataRecordInterface } from '../../src/index.js';

import { DataAnalyzer } from '../../src/index.js';
import scenarioGroups from './DataAnalyzer.scenarios.json' with { type: 'json' };

type JsonRecord = Record<string, unknown>;
type BoundsExpectation = { readonly maximum: number; readonly minimum: number; readonly type: string };
type ScenarioCase =
  | { readonly description: string; readonly expected: { readonly bounds?: BoundsExpectation; readonly cardinality?: number; readonly coverage?: number; readonly nullCount?: number; readonly type: string }; readonly input: { readonly fixture: string; readonly property: string }; readonly name: string; readonly shape: 'property-analysis' }
  | { readonly description: string; readonly expected: { readonly inRecommended: boolean; readonly present: boolean }; readonly input: { readonly fixture: string; readonly property: string }; readonly name: string; readonly shape: 'property-absent' }
  | { readonly description: string; readonly expected: { readonly ascending: boolean }; readonly input: { readonly fixture: string }; readonly name: string; readonly shape: 'cardinality-order' }
  | { readonly description: string; readonly expected: { readonly absent: readonly string[]; readonly present: readonly string[] }; readonly input: { readonly exclude: readonly string[]; readonly fixture: string }; readonly name: string; readonly shape: 'exclude-option' }
  | { readonly description: string; readonly expected: { readonly propertyCount: number; readonly recommendedGrouping: readonly string[]; readonly totalRecords: number }; readonly input: { readonly fixture: string }; readonly name: string; readonly shape: 'empty-dataset' };

interface ScenarioGroups {
  readonly cases: readonly ScenarioCase[];
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

function requireStringArray(value: unknown): readonly string[] {
  return requireArray(value).map(requireString);
}

function optionalNumber(record: JsonRecord, key: string): number | undefined {
  return Object.hasOwn(record, key) ? requireNumber(requireValue(record, key)) : undefined;
}

function parseScenario(value: unknown): ScenarioCase {
  const record = requireRecord(value);
  const input = requireRecord(requireValue(record, 'input'));
  const expected = requireRecord(requireValue(record, 'expected'));
  const description = requireString(requireValue(record, 'description'));
  const name = requireString(requireValue(record, 'name'));
  const shape = requireString(requireValue(record, 'shape'));
  if (shape === 'property-analysis') {
    const boundsValue = Object.hasOwn(expected, 'bounds') ? requireRecord(requireValue(expected, 'bounds')) : undefined;
    const bounds = boundsValue === undefined ? undefined : { 'maximum': requireNumber(requireValue(boundsValue, 'maximum')), 'minimum': requireNumber(requireValue(boundsValue, 'minimum')), 'type': requireString(requireValue(boundsValue, 'type')) };
    const analysisExpected: { bounds?: BoundsExpectation; cardinality?: number; coverage?: number; nullCount?: number; type: string } = { 'type': requireString(requireValue(expected, 'type')) };
    const cardinality = optionalNumber(expected, 'cardinality');
    const coverage = optionalNumber(expected, 'coverage');
    const nullCount = optionalNumber(expected, 'nullCount');
    if (bounds !== undefined) analysisExpected.bounds = bounds;
    if (cardinality !== undefined) analysisExpected.cardinality = cardinality;
    if (coverage !== undefined) analysisExpected.coverage = coverage;
    if (nullCount !== undefined) analysisExpected.nullCount = nullCount;
    return { 'description': description, 'expected': analysisExpected, 'input': { 'fixture': requireString(requireValue(input, 'fixture')), 'property': requireString(requireValue(input, 'property')) }, 'name': name, 'shape': shape };
  }
  if (shape === 'property-absent') return { 'description': description, 'expected': { 'inRecommended': requireBoolean(requireValue(expected, 'inRecommended')), 'present': requireBoolean(requireValue(expected, 'present')) }, 'input': { 'fixture': requireString(requireValue(input, 'fixture')), 'property': requireString(requireValue(input, 'property')) }, 'name': name, 'shape': shape };
  if (shape === 'cardinality-order') return { 'description': description, 'expected': { 'ascending': requireBoolean(requireValue(expected, 'ascending')) }, 'input': { 'fixture': requireString(requireValue(input, 'fixture')) }, 'name': name, 'shape': shape };
  if (shape === 'exclude-option') return { 'description': description, 'expected': { 'absent': requireStringArray(requireValue(expected, 'absent')), 'present': requireStringArray(requireValue(expected, 'present')) }, 'input': { 'exclude': requireStringArray(requireValue(input, 'exclude')), 'fixture': requireString(requireValue(input, 'fixture')) }, 'name': name, 'shape': shape };
  if (shape === 'empty-dataset') return { 'description': description, 'expected': { 'propertyCount': requireNumber(requireValue(expected, 'propertyCount')), 'recommendedGrouping': requireStringArray(requireValue(expected, 'recommendedGrouping')), 'totalRecords': requireNumber(requireValue(expected, 'totalRecords')) }, 'input': { 'fixture': requireString(requireValue(input, 'fixture')) }, 'name': name, 'shape': shape };
  assert.fail(`Unknown DataAnalyzer scenario shape: ${shape}`);
}

function parseScenarioGroups(value: unknown): ScenarioGroups {
  const root = requireRecord(value);
  const fixtures = new Map<string, readonly DataRecordInterface[]>();
  for (const [name, values] of Object.entries(requireRecord(requireValue(root, 'fixtures')))) {
    fixtures.set(name, requireArray(values).map(requireRecord));
  }
  return { 'cases': requireArray(requireValue(root, 'cases')).map(parseScenario), 'fixtures': fixtures };
}

function recordsFor(fixtures: ReadonlyMap<string, readonly DataRecordInterface[]>, name: string): readonly DataRecordInterface[] {
  const records = fixtures.get(name);
  assert.ok(records !== undefined, `No fixture named '${name}'`);
  return records;
}

function runScenario(groups: ScenarioGroups, scenarioCase: ScenarioCase): void {
  if (scenarioCase.shape === 'property-analysis') {
    const result = DataAnalyzer.analyze([...recordsFor(groups.fixtures, scenarioCase.input.fixture)]);
    const info = result.properties.get(scenarioCase.input.property);
    assert.ok(info !== undefined);
    assert.equal(info.type, scenarioCase.expected.type);
    if (scenarioCase.expected.cardinality !== undefined) assert.equal(info.cardinality, scenarioCase.expected.cardinality);
    if (scenarioCase.expected.coverage !== undefined) assert.equal(info.coverage, scenarioCase.expected.coverage);
    if (scenarioCase.expected.nullCount !== undefined) assert.equal(info.nullCount, scenarioCase.expected.nullCount);
    if (scenarioCase.expected.bounds !== undefined) {
      assert.ok(info.bounds !== undefined);
      assert.equal(info.bounds.type, scenarioCase.expected.bounds.type);
      assert.equal(info.bounds.minimum, scenarioCase.expected.bounds.minimum);
      assert.equal(info.bounds.maximum, scenarioCase.expected.bounds.maximum);
    }
    return;
  }
  if (scenarioCase.shape === 'property-absent') {
    const result = DataAnalyzer.analyze([...recordsFor(groups.fixtures, scenarioCase.input.fixture)]);
    assert.equal(result.properties.has(scenarioCase.input.property), scenarioCase.expected.present);
    assert.equal(result.recommendedGrouping.includes(scenarioCase.input.property), scenarioCase.expected.inRecommended);
    return;
  }
  if (scenarioCase.shape === 'cardinality-order') {
    const result = DataAnalyzer.analyze([...recordsFor(groups.fixtures, scenarioCase.input.fixture)]);
    for (let index = 1; index < result.recommendedGrouping.length; index += 1) {
      const previous = result.properties.get(result.recommendedGrouping[index - 1] ?? '');
      const current = result.properties.get(result.recommendedGrouping[index] ?? '');
      assert.ok(previous !== undefined && current !== undefined);
      assert.equal(previous.cardinality <= current.cardinality, scenarioCase.expected.ascending);
    }
    return;
  }
  if (scenarioCase.shape === 'exclude-option') {
    const result = DataAnalyzer.analyze([...recordsFor(groups.fixtures, scenarioCase.input.fixture)], { 'excludeProperties': [...scenarioCase.input.exclude] });
    for (const property of scenarioCase.expected.absent) assert.equal(result.properties.has(property), false);
    for (const property of scenarioCase.expected.present) assert.equal(result.properties.has(property), true);
    return;
  }
  const result = DataAnalyzer.analyze([...recordsFor(groups.fixtures, scenarioCase.input.fixture)]);
  assert.equal(result.totalRecords, scenarioCase.expected.totalRecords);
  assert.equal(result.properties.size, scenarioCase.expected.propertyCount);
  assert.deepEqual(result.recommendedGrouping, scenarioCase.expected.recommendedGrouping);
}

const parsedScenarioGroups = parseScenarioGroups(scenarioGroups);

void describe('DataAnalyzer', () => {
  for (const scenarioCase of parsedScenarioGroups.cases) {
    void it(`${scenarioCase.name}: ${scenarioCase.description}`, () => {
      runScenario(parsedScenarioGroups, scenarioCase);
    });
  }
});
