import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import { DataAnalyzer } from '../../src/index.js';
import fixtureGroups from './DataAnalyzer.fixtures.json' with { 'type': 'json' };
import scenarioGroups from './DataAnalyzer.scenarios.json' with { 'type': 'json' };
import { DataAnalyzerScenarioCaseEntity } from './entities/DataAnalyzerScenarioCaseEntity.js';

class DataAnalyzerRunners {
  private static readonly fixtures: ReadonlyMap<string, readonly Record<string, unknown>[]> = new Map<string, readonly Record<string, unknown>[]>([
    ['default', fixtureGroups.fixtures.default],
    ['empty', fixtureGroups.fixtures.empty]
  ]);

  static 'cardinality-order'(scenarioCase: ScenarioCaseOfType<DataAnalyzerScenarioCaseEntity.Type, 'cardinality-order'>): void {
    const result = DataAnalyzer.analyze([...DataAnalyzerRunners.recordsFor(scenarioCase.input.fixture)]);
    for (let index = 1; index < result.recommendedGrouping.length; index += 1) {
      const previous = result.properties.get(result.recommendedGrouping[index - 1] ?? '');
      const current = result.properties.get(result.recommendedGrouping[index] ?? '');
      assert.ok(previous !== undefined && current !== undefined);
      assert.equal(previous.cardinality <= current.cardinality, scenarioCase.expected.ascending);
    }
  }

  static 'empty-dataset'(scenarioCase: ScenarioCaseOfType<DataAnalyzerScenarioCaseEntity.Type, 'empty-dataset'>): void {
    const result = DataAnalyzer.analyze([...DataAnalyzerRunners.recordsFor(scenarioCase.input.fixture)]);
    assert.equal(result.totalRecords, scenarioCase.expected.totalRecords);
    assert.equal(result.properties.size, scenarioCase.expected.propertyCount);
    assert.deepEqual(result.recommendedGrouping, scenarioCase.expected.recommendedGrouping);
  }

  static 'exclude-option'(scenarioCase: ScenarioCaseOfType<DataAnalyzerScenarioCaseEntity.Type, 'exclude-option'>): void {
    const result = DataAnalyzer.analyze([...DataAnalyzerRunners.recordsFor(scenarioCase.input.fixture)], { 'excludeProperties': [...scenarioCase.input.exclude] });
    const absent = scenarioCase.expected.absent;
    for (let index = 0; index < absent.length; index += 1) {
      assert.equal(result.properties.has(String(absent[index])), false);
    }
    const present = scenarioCase.expected.present;
    for (let index = 0; index < present.length; index += 1) {
      assert.equal(result.properties.has(String(present[index])), true);
    }
  }

  static 'property-absent'(scenarioCase: ScenarioCaseOfType<DataAnalyzerScenarioCaseEntity.Type, 'property-absent'>): void {
    const result = DataAnalyzer.analyze([...DataAnalyzerRunners.recordsFor(scenarioCase.input.fixture)]);
    assert.equal(result.properties.has(scenarioCase.input.property), scenarioCase.expected.present);
    assert.equal(result.recommendedGrouping.includes(scenarioCase.input.property), scenarioCase.expected.inRecommended);
  }

  static 'property-analysis'(scenarioCase: ScenarioCaseOfType<DataAnalyzerScenarioCaseEntity.Type, 'property-analysis'>): void {
    const result = DataAnalyzer.analyze([...DataAnalyzerRunners.recordsFor(scenarioCase.input.fixture)]);
    const info = result.properties.get(scenarioCase.input.property);
    assert.ok(info !== undefined);
    assert.equal(info.type, scenarioCase.expected.type);
    if (scenarioCase.expected.cardinality !== undefined) {
      assert.equal(info.cardinality, scenarioCase.expected.cardinality);
    }
    if (scenarioCase.expected.coverage !== undefined) {
      assert.equal(info.coverage, scenarioCase.expected.coverage);
    }
    if (scenarioCase.expected.nullCount !== undefined) {
      assert.equal(info.nullCount, scenarioCase.expected.nullCount);
    }
    if (scenarioCase.expected.bounds !== undefined) {
      assert.ok(info.bounds !== undefined);
      assert.equal(info.bounds.type, scenarioCase.expected.bounds.type);
      assert.equal(info.bounds.minimum, scenarioCase.expected.bounds.minimum);
      assert.equal(info.bounds.maximum, scenarioCase.expected.bounds.maximum);
    }
  }

  private static recordsFor(name: string): readonly Record<string, unknown>[] {
    const records = DataAnalyzerRunners.fixtures.get(name);
    assert.ok(records !== undefined, `No fixture named '${name}'`);
    return records;
  }
}

ScenarioSuite.register({
  'entity': DataAnalyzerScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'DataAnalyzer',
  'runners': DataAnalyzerRunners
});
