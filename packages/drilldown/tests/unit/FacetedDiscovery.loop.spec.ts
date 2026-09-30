import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import type { FacetAccessorMapType, FacetFilterStateType } from '../../src/index.js';
import type { FacetFilterEntity } from './entities/FacetFilterEntity.js';
import type { FacetMatchEntity } from './entities/FacetMatchEntity.js';
import type { FacetRowEntity } from './entities/FacetRowEntity.js';

import { FacetedDiscovery } from '../../src/index.js';
import { FacetedDiscoveryScenarioCaseEntity } from './entities/FacetedDiscoveryScenarioCaseEntity.js';
import fixtureGroups from './FacetedDiscovery.fixtures.json' with { 'type': 'json' };
import scenarioGroups from './FacetedDiscovery.scenarios.json' with { 'type': 'json' };

class FacetedDiscoveryRunners {
  private static readonly accessors: FacetAccessorMapType<FacetRowEntity.Type, 'color' | 'size'> = Object.assign(
    {},
    Object.freeze({ 'color': (row: FacetRowEntity.Type): string => { return row.color; } }),
    Object.freeze({ 'size': (row: FacetRowEntity.Type): string => { return row.size; } })
  );
  private static readonly dimensions: readonly ('color' | 'size')[] = ['color', 'size'];
  private static readonly fixtures: ReadonlyMap<string, readonly FacetRowEntity.Type[]> = new Map<string, readonly FacetRowEntity.Type[]>([
    ['default', fixtureGroups.fixtures.default]
  ]);

  static 'apply'(scenarioCase: ScenarioCaseOfType<FacetedDiscoveryScenarioCaseEntity.Type, 'apply'>): void {
    const filtered = FacetedDiscovery.apply(
      FacetedDiscoveryRunners.rowsFor(scenarioCase.input.fixture),
      FacetedDiscoveryRunners.dimensions,
      FacetedDiscoveryRunners.toFilterState(scenarioCase.input.filter),
      FacetedDiscoveryRunners.accessors
    );

    assert.equal(filtered.length, scenarioCase.expected.count);
    assert.ok(filtered.every((row) => {
      const matched = FacetedDiscoveryRunners.matches(row, scenarioCase.expected.match);
      return matched;
    }));
  }

  static 'facet-options'(scenarioCase: ScenarioCaseOfType<FacetedDiscoveryScenarioCaseEntity.Type, 'facet-options'>): void {
    const options = FacetedDiscovery.facetOptions(
      FacetedDiscoveryRunners.rowsFor(scenarioCase.input.fixture),
      FacetedDiscoveryRunners.dimensions,
      FacetedDiscoveryRunners.toFilterState(scenarioCase.input.filter),
      FacetedDiscoveryRunners.accessors,
      FacetedDiscoveryRunners.requireDimension(scenarioCase.input.dimension)
    );

    assert.deepEqual([...options].toSorted(), scenarioCase.expected.options);
  }

  static 'resolve-narrows'(scenarioCase: ScenarioCaseOfType<FacetedDiscoveryScenarioCaseEntity.Type, 'resolve-narrows'>): void {
    const resolved = FacetedDiscovery.resolveFilterState(
      FacetedDiscoveryRunners.rowsFor(scenarioCase.input.fixture),
      FacetedDiscoveryRunners.dimensions,
      FacetedDiscoveryRunners.accessors,
      FacetedDiscoveryRunners.toFilterState(scenarioCase.input.proposed),
      FacetedDiscoveryRunners.requireDimension(scenarioCase.input.changed)
    );

    const dimension = FacetedDiscoveryRunners.requireDimension(scenarioCase.expected.dimension);
    assert.deepEqual([...(resolved[dimension] ?? new Set())].toSorted(), scenarioCase.expected.values);
  }

  static 'resolve-relaxes'(scenarioCase: ScenarioCaseOfType<FacetedDiscoveryScenarioCaseEntity.Type, 'resolve-relaxes'>): void {
    const rows = FacetedDiscoveryRunners.rowsFor(scenarioCase.input.fixture);
    const resolved = FacetedDiscovery.resolveFilterState(
      rows,
      FacetedDiscoveryRunners.dimensions,
      FacetedDiscoveryRunners.accessors,
      FacetedDiscoveryRunners.toFilterState(scenarioCase.input.proposed),
      FacetedDiscoveryRunners.requireDimension(scenarioCase.input.changed)
    );
    const result = FacetedDiscovery.apply(rows, FacetedDiscoveryRunners.dimensions, resolved, FacetedDiscoveryRunners.accessors);

    assert.ok(result.length >= scenarioCase.expected.minimumCount);
    assert.ok(result.every((row) => {
      const matched = FacetedDiscoveryRunners.matches(row, scenarioCase.expected.match);
      return matched;
    }));
  }

  private static matches(row: FacetRowEntity.Type, expected: FacetMatchEntity.Type): boolean {
    const colorOk = expected.color === undefined || row.color === expected.color;
    const sizeOk = expected.size === undefined || row.size === expected.size;
    const result = colorOk && sizeOk;

    return result;
  }

  private static requireDimension(value: string): 'color' | 'size' {
    assert.ok(value === 'color' || value === 'size', `${value} must be a known dimension`);
    return value;
  }

  private static rowsFor(name: string): readonly FacetRowEntity.Type[] {
    const rows = FacetedDiscoveryRunners.fixtures.get(name);
    assert.ok(rows !== undefined, `no fixture named '${name}'`);
    return rows;
  }

  private static toFilterState(source: FacetFilterEntity.Type): FacetFilterStateType<'color' | 'size'> {
    const state: FacetFilterStateType<'color' | 'size'> = {};

    if (source.color !== undefined) {
      state.color = new Set(source.color);
    }
    if (source.size !== undefined) {
      state.size = new Set(source.size);
    }

    return state;
  }
}

ScenarioSuite.register({
  'entity': FacetedDiscoveryScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'FacetedDiscovery',
  'runners': FacetedDiscoveryRunners
});
