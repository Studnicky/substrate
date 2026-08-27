import assert from 'node:assert/strict';
import { it } from 'node:test';

import type { DataRecordInterface, DrillDownConfigEntity, GroupNodeInterface } from '../../src/index.js';

import { DrillDown } from '../../src/index.js';

type OrderType = {
  'category': string
  'region': string
};

function buildOrders(): OrderType[] {
  return [
    { 'category': 'alpha', 'region': 'east' },
    { 'category': 'alpha', 'region': 'west' },
    { 'category': 'beta', 'region': 'east' },
    { 'category': 'beta', 'region': 'east' },
    { 'category': 'gamma', 'region': 'west' }
  ];
}

function explicitCategoryConfig(): DrillDownConfigEntity.Type {
  return {
    'minimumGroupSize': 0,
    'rules': {
      'group': [{
        'property': 'category',
        'values': [
          { 'match': 'alpha', 'type': 'string' },
          { 'match': 'beta', 'type': 'string' },
          { 'match': 'gamma', 'type': 'string' }
        ]
      }]
    }
  };
}

function leafRecordCounts(node: GroupNodeInterface): number[] {
  if (node.grouped === null) {
    return [node.ungrouped?.length ?? 0];
  }
  const result = node.grouped.flatMap(leafRecordCounts);
  return result;
}

it('groups records by an explicit string rule, preserving declared value order', () => {
  const drilldown = new DrillDown();
  const tree = drilldown.group(buildOrders() as unknown as DataRecordInterface[], explicitCategoryConfig());

  assert.ok(tree.grouped !== null);
  assert.equal(tree.grouped.length, 3);
  assert.deepEqual(tree.grouped.map((child) => { return child.value; }), [
    'alpha',
    'beta',
    'gamma'
  ]);
  assert.deepEqual(leafRecordCounts(tree), [2, 2, 1]);
});

it('produces an identical grouped tree across repeated calls with the same input (deterministic ordering)', () => {
  const drilldown = new DrillDown();
  const data = buildOrders() as unknown as DataRecordInterface[];
  const config = explicitCategoryConfig();

  const first = drilldown.group(data, config);
  const second = drilldown.group(data, config);

  assert.deepEqual(first, second);
});

it('produces an identical auto-grouped analysis across repeated calls (deterministic property ordering)', () => {
  const drilldown = new DrillDown();
  const data = buildOrders() as unknown as DataRecordInterface[];

  const first = drilldown.analyze(data);
  const second = drilldown.analyze(data);

  assert.deepEqual(first.selectedGrouping, second.selectedGrouping);
  assert.deepEqual(first.recommendedGrouping, second.recommendedGrouping);
});

it('returns a single leaf node for empty input', () => {
  const drilldown = new DrillDown();
  const tree = drilldown.group([], explicitCategoryConfig());

  assert.equal(tree.grouped, null);
  assert.deepEqual(tree.ungrouped, []);
});

it('applies top-level value filters before grouping', () => {
  const drilldown = new DrillDown();
  const config: DrillDownConfigEntity.Type = {
    ...explicitCategoryConfig(),
    'filter': [{ 'operator': 'exclude', 'property': 'region', 'type': 'value', 'values': ['west'] }]
  };

  const tree = drilldown.group(buildOrders() as unknown as DataRecordInterface[], config);

  assert.ok(tree.grouped !== null);
  // 'west' records (alpha/east+west, gamma/west) are excluded — only alpha/east and beta/east*2 remain.
  const remainingValues = tree.grouped.map((child) => { return child.value; });
  assert.deepEqual(remainingValues, ['alpha', 'beta']);
  assert.deepEqual(leafRecordCounts(tree), [1, 2]);
});
