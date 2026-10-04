import { BaseError } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { it } from 'node:test';

import type { ScenarioCaseOfType } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import type { GroupNodeInterface } from '../../src/index.js';

import { ScenarioSuite } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { DrillDown, DrillDownConfigEntity } from '../../src/index.js';
import { valueDiscoveryEngine } from '../../src/modules/rules/valueDiscoveryEngine.js';
import fixtureGroups from './DrillDown.fixtures.json' with { 'type': 'json' };
import scenarioGroups from './DrillDown.scenarios.json' with { 'type': 'json' };
import { DrillDownScenarioCaseEntity } from './entities/DrillDownScenarioCaseEntity.js';

class DrillDownFixtureError extends BaseError {
  public override readonly name: string = 'DrillDownFixtureError';

  public constructor(message: string, cause?: unknown) {
    super({
      'cause': cause,
      'code': 'drilldown.testFixtureFailed',
      'message': message,
      'retryable': false
    });
  }
}

class DrillDownRunners {
  private static readonly configs: ReadonlyMap<string, DrillDownConfigEntity.Type> = new Map<string, DrillDownConfigEntity.Type>([
    ['excludeWest', DrillDownConfigEntity.intake(fixtureGroups.configs.excludeWest)],
    ['explicitCategory', DrillDownConfigEntity.intake(fixtureGroups.configs.explicitCategory)]
  ]);

  private static readonly fixtures: ReadonlyMap<string, readonly Record<string, unknown>[]> = new Map<string, readonly Record<string, unknown>[]>([
    ['empty', fixtureGroups.fixtures.empty],
    ['orders', fixtureGroups.fixtures.orders]
  ]);

  static 'deterministic-analyze'(scenarioCase: ScenarioCaseOfType<DrillDownScenarioCaseEntity.Type, 'deterministic-analyze'>): void {
    const drilldown = new DrillDown();
    const records = [...DrillDownRunners.recordsFor(scenarioCase.input.fixture)];
    const first = drilldown.analyze(records);
    const second = drilldown.analyze(records);
    assert.deepEqual(first.selectedGrouping, second.selectedGrouping);
    assert.deepEqual(first.recommendedGrouping, second.recommendedGrouping);
    assert.equal(scenarioCase.expected.identical, true);
  }

  static 'deterministic-group'(scenarioCase: ScenarioCaseOfType<DrillDownScenarioCaseEntity.Type, 'deterministic-group'>): void {
    const drilldown = new DrillDown();
    const records = [...DrillDownRunners.recordsFor(scenarioCase.input.fixture)];
    const config = DrillDownRunners.configFor(scenarioCase.input.config);
    const first = drilldown.group(records, config);
    const second = drilldown.group(records, config);
    assert.equal(DrillDownRunners.serialize(first) === DrillDownRunners.serialize(second), scenarioCase.expected.identical);
    assert.deepEqual(first, second);
  }

  static 'group'(scenarioCase: ScenarioCaseOfType<DrillDownScenarioCaseEntity.Type, 'group'>): void {
    const drilldown = new DrillDown();
    const tree = drilldown.group([...DrillDownRunners.recordsFor(scenarioCase.input.fixture)], DrillDownRunners.configFor(scenarioCase.input.config));
    assert.ok(tree.grouped !== null);
    assert.equal(tree.grouped.length, scenarioCase.expected.childCount);
    assert.deepEqual(tree.grouped.map((child) => {
      const value = child.value;
      return value;
    }), scenarioCase.expected.values);
    assert.deepEqual(DrillDownRunners.leafRecordCounts(tree), scenarioCase.expected.leafCounts);
  }

  static 'group-empty'(scenarioCase: ScenarioCaseOfType<DrillDownScenarioCaseEntity.Type, 'group-empty'>): void {
    const drilldown = new DrillDown();
    const tree = drilldown.group([...DrillDownRunners.recordsFor(scenarioCase.input.fixture)], DrillDownRunners.configFor(scenarioCase.input.config));
    assert.equal(tree.grouped, scenarioCase.expected.grouped);
    assert.deepEqual(tree.ungrouped, scenarioCase.expected.ungrouped);
  }

  static declaresSequentialValueDiscovery(): void {
    void it('discovers prefixed and zero-padded sequential values', () => {
      const prefixed = valueDiscoveryEngine.discoverValues([
        { 'identifier': 'item-001' },
        { 'identifier': 'item-002' },
        { 'identifier': 'item-003' },
        { 'identifier': 'item-004' },
        { 'identifier': 'item-005' }
      ], 'identifier', { 'granularity': { 'count': 1 }, 'type': 'string' });
      const zeroPadded = valueDiscoveryEngine.discoverValues([
        { 'identifier': '001' },
        { 'identifier': '002' },
        { 'identifier': '003' },
        { 'identifier': '004' },
        { 'identifier': '005' }
      ], 'identifier', { 'granularity': { 'count': 1 }, 'type': 'string' });

      assert.deepEqual(prefixed, [{
        'sequential': { 'maximum': 5, 'minimum': 1, 'padding': 3, 'prefix': 'item-' },
        'type': 'sequential'
      }]);
      assert.deepEqual(zeroPadded, [{
        'sequential': { 'maximum': 5, 'minimum': 1, 'padding': 3, 'prefix': '' },
        'type': 'sequential'
      }]);
    });
  }

  private static configFor(name: string): DrillDownConfigEntity.Type {
    const config = DrillDownRunners.configs.get(name);
    assert.ok(config !== undefined, `No config named '${name}'`);
    return config;
  }

  private static leafRecordCounts(node: GroupNodeInterface): number[] {
    const counts: number[] = [];
    if (node.grouped === null) {
      counts.push(node.ungrouped?.length ?? 0);
    } else {
      for (let index = 0; index < node.grouped.length; index += 1) {
        const child: GroupNodeInterface | undefined = node.grouped[index];
        assert.ok(child !== undefined);
        counts.push(...DrillDownRunners.leafRecordCounts(child));
      }
    }
    return counts;
  }

  private static serialize(tree: GroupNodeInterface): string {
    try {
      const text = JSON.stringify(tree);
      return text;
    } catch (cause) {
      throw new DrillDownFixtureError('Grouped tree is not serializable', cause);
    }
  }

  private static recordsFor(name: string): readonly Record<string, unknown>[] {
    const records = DrillDownRunners.fixtures.get(name);
    assert.ok(records !== undefined, `No fixture named '${name}'`);
    return records;
  }
}

ScenarioSuite.register({
  'entity': DrillDownScenarioCaseEntity,
  'extraTests': DrillDownRunners.declaresSequentialValueDiscovery,
  'file': scenarioGroups,
  'name': 'DrillDown',
  'runners': DrillDownRunners
});
