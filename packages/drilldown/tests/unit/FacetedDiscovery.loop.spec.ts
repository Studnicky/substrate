import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Predicates } from '@studnicky/types';

import type { FacetAccessorMapType, FacetFilterStateType } from '../../src/index.js';

import { FacetedDiscovery } from '../../src/index.js';
import scenarioGroups from './FacetedDiscovery.scenarios.json' with { type: 'json' };

type RowType = { readonly 'color': string; readonly 'size': string };
interface MutableRowMatchInterface {
  'color'?: string;
  'size'?: string;
}
type DimensionType = 'color' | 'size';
type FixtureMapType = Record<string, readonly RowType[]>;
type FilterFixtureType = Record<string, readonly string[]>;

type ScenarioCase =
  | { readonly 'description': string; readonly 'expected': { readonly 'options': readonly string[] }; readonly 'input': { readonly 'dimension': DimensionType; readonly 'filter': FilterFixtureType; readonly 'fixture': string }; readonly 'name': string; readonly 'shape': 'facet-options' }
  | { readonly 'description': string; readonly 'expected': { readonly 'count': number; readonly 'match': Partial<RowType> }; readonly 'input': { readonly 'filter': FilterFixtureType; readonly 'fixture': string }; readonly 'name': string; readonly 'shape': 'apply' }
  | {
      readonly 'description': string;
      readonly 'expected': { readonly 'dimension': DimensionType; readonly 'values': readonly string[] };
      readonly 'input': { readonly 'changed': DimensionType; readonly 'fixture': string; readonly 'proposed': FilterFixtureType };
      readonly 'name': string;
      readonly 'shape': 'resolve-narrows';
    }
  | {
      readonly 'description': string;
      readonly 'expected': { readonly 'match': Partial<RowType>; readonly 'minimumCount': number };
      readonly 'input': { readonly 'changed': DimensionType; readonly 'fixture': string; readonly 'proposed': FilterFixtureType };
      readonly 'name': string;
      readonly 'shape': 'resolve-relaxes';
    };

type ScenarioGroupsType = { readonly 'cases': readonly ScenarioCase[]; readonly 'fixtures': FixtureMapType };

const dimensions: readonly DimensionType[] = ['color', 'size'];
const accessors: FacetAccessorMapType<RowType, DimensionType> = {
  'color': (row) => { return row.color; },
  'size': (row) => { return row.size; }
};

function requireRecord(value: unknown, name: string): Record<string, unknown> {
  assert.ok(Predicates.isObject(value), `${name} must be an object`);
  return value;
}

function requireString(value: unknown, name: string): string {
  assert.ok(Predicates.isString(value), `${name} must be a string`);
  return value;
}

function requireStringArray(value: unknown, name: string): readonly string[] {
  assert.ok(Predicates.isArray(value), `${name} must be an array`);
  const result: string[] = [];

  for (const item of value) {
    result.push(requireString(item, `${name} item`));
  }

  return result;
}

function requireDimension(value: unknown, name: string): DimensionType {
  assert.ok(value === 'color' || value === 'size', `${name} must be a known dimension`);
  return value;
}

function requireCount(value: unknown, name: string): number {
  assert.ok(Predicates.isNumber(value) && value >= 0, `${name} must be a non-negative number`);
  return value;
}

function parseFilterFixture(value: unknown, name: string): FilterFixtureType {
  const record = requireRecord(value, name);
  const result: Record<string, readonly string[]> = {};

  for (const [dimension, values] of Object.entries(record)) {
    result[dimension] = requireStringArray(values, `${name} ${dimension}`);
  }

  return result;
}

function parseRow(value: unknown, name: string): RowType {
  const record = requireRecord(value, name);
  const result: RowType = {
    'color': requireString(record['color'], `${name} color`),
    'size': requireString(record['size'], `${name} size`)
  };

  return result;
}

function parseFixtures(value: unknown): FixtureMapType {
  const fixtureRecords = requireRecord(value, 'scenario fixtures');
  const result: Record<string, readonly RowType[]> = {};

  for (const [fixtureName, fixtureRows] of Object.entries(fixtureRecords)) {
    assert.ok(Predicates.isArray(fixtureRows), `fixture ${fixtureName} must be an array`);
    const rows: RowType[] = [];

    for (const row of fixtureRows) {
      rows.push(parseRow(row, `fixture ${fixtureName} row`));
    }
    result[fixtureName] = rows;
  }

  return result;
}

function parseMatch(value: unknown, name: string): Partial<RowType> {
  const record = requireRecord(value, name);
  const result: MutableRowMatchInterface = {};

  if (record['color'] !== undefined) {
    result.color = requireString(record['color'], `${name} color`);
  }
  if (record['size'] !== undefined) {
    result.size = requireString(record['size'], `${name} size`);
  }

  return result;
}

function parseScenarioCase(value: unknown): ScenarioCase {
  const record = requireRecord(value, 'scenario case');
  const expected = requireRecord(record['expected'], 'scenario expected');
  const input = requireRecord(record['input'], 'scenario input');
  const name = requireString(record['name'], 'scenario name');
  const description = requireString(record['description'], 'scenario description');
  const fixture = requireString(input['fixture'], 'scenario input fixture');
  const shape = requireString(record['shape'], 'scenario shape');

  if (shape === 'facet-options') {
    return {
      'description': description,
      'expected': { 'options': requireStringArray(expected['options'], 'scenario expected options') },
      'input': {
        'dimension': requireDimension(input['dimension'], 'scenario input dimension'),
        'filter': parseFilterFixture(input['filter'], 'scenario input filter'),
        'fixture': fixture
      },
      'name': name,
      'shape': shape
    };
  }

  if (shape === 'apply') {
    return {
      'description': description,
      'expected': {
        'count': requireCount(expected['count'], 'scenario expected count'),
        'match': parseMatch(expected['match'], 'scenario expected match')
      },
      'input': { 'filter': parseFilterFixture(input['filter'], 'scenario input filter'), 'fixture': fixture },
      'name': name,
      'shape': shape
    };
  }

  if (shape === 'resolve-narrows') {
    return {
      'description': description,
      'expected': {
        'dimension': requireDimension(expected['dimension'], 'scenario expected dimension'),
        'values': requireStringArray(expected['values'], 'scenario expected values')
      },
      'input': {
        'changed': requireDimension(input['changed'], 'scenario input changed'),
        'fixture': fixture,
        'proposed': parseFilterFixture(input['proposed'], 'scenario input proposed')
      },
      'name': name,
      'shape': shape
    };
  }

  assert.equal(shape, 'resolve-relaxes', `unknown scenario shape: ${shape}`);
  return {
    'description': description,
    'expected': {
      'match': parseMatch(expected['match'], 'scenario expected match'),
      'minimumCount': requireCount(expected['minimumCount'], 'scenario expected minimumCount')
    },
    'input': {
      'changed': requireDimension(input['changed'], 'scenario input changed'),
      'fixture': fixture,
      'proposed': parseFilterFixture(input['proposed'], 'scenario input proposed')
    },
    'name': name,
    'shape': shape
  };
}

function parseScenarioGroups(value: unknown): ScenarioGroupsType {
  const record = requireRecord(value, 'scenario groups');
  const rawCases = record['cases'];
  assert.ok(Predicates.isArray(rawCases), 'scenario cases must be an array');
  const cases: ScenarioCase[] = [];

  for (const scenarioCase of rawCases) {
    cases.push(parseScenarioCase(scenarioCase));
  }

  return { 'cases': cases, 'fixtures': parseFixtures(record['fixtures']) };
}

const parsedScenarioGroups = parseScenarioGroups(scenarioGroups);

function rowsFor(name: string): readonly RowType[] {
  const rows = parsedScenarioGroups.fixtures[name];
  assert.ok(rows !== undefined, `no fixture named '${name}'`);
  return rows;
}

function toFilterState(source: FilterFixtureType): FacetFilterStateType<DimensionType> {
  const state: FacetFilterStateType<DimensionType> = {};

  for (const dimension of dimensions) {
    const values = source[dimension];

    if (values !== undefined) {
      state[dimension] = new Set(values);
    }
  }

  return state;
}

function matches(row: RowType, expected: Partial<RowType>): boolean {
  const colorOk = expected.color === undefined || row.color === expected.color;
  const sizeOk = expected.size === undefined || row.size === expected.size;
  const result = colorOk && sizeOk;

  return result;
}

void describe('FacetedDiscovery', () => {
  for (const scenarioCase of parsedScenarioGroups.cases) {
    void it(`${scenarioCase.name}: ${scenarioCase.description}`, () => {
      if (scenarioCase.shape === 'facet-options') {
        const options = FacetedDiscovery.facetOptions(
          rowsFor(scenarioCase.input.fixture),
          dimensions,
          toFilterState(scenarioCase.input.filter),
          accessors,
          scenarioCase.input.dimension
        );

        assert.deepEqual([...options].toSorted(), scenarioCase.expected.options);
        return;
      }

      if (scenarioCase.shape === 'apply') {
        const filtered = FacetedDiscovery.apply(
          rowsFor(scenarioCase.input.fixture),
          dimensions,
          toFilterState(scenarioCase.input.filter),
          accessors
        );

        assert.equal(filtered.length, scenarioCase.expected.count);
        assert.ok(filtered.every((row) => { return matches(row, scenarioCase.expected.match); }));
        return;
      }

      if (scenarioCase.shape === 'resolve-narrows') {
        const resolved = FacetedDiscovery.resolveFilterState(
          rowsFor(scenarioCase.input.fixture),
          dimensions,
          accessors,
          toFilterState(scenarioCase.input.proposed),
          scenarioCase.input.changed
        );

        assert.deepEqual([...(resolved[scenarioCase.expected.dimension] ?? new Set())].toSorted(), scenarioCase.expected.values);
        return;
      }

      const rows = rowsFor(scenarioCase.input.fixture);
      const resolved = FacetedDiscovery.resolveFilterState(
        rows,
        dimensions,
        accessors,
        toFilterState(scenarioCase.input.proposed),
        scenarioCase.input.changed
      );
      const result = FacetedDiscovery.apply(rows, dimensions, resolved, accessors);

      assert.ok(result.length >= scenarioCase.expected.minimumCount);
      assert.ok(result.every((row) => { return matches(row, scenarioCase.expected.match); }));
    });
  }
});
