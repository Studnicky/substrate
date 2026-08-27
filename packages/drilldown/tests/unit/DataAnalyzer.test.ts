import assert from 'node:assert/strict';
import { it } from 'node:test';

import { DataAnalyzer } from '../../src/index.js';

type FixtureRecordType = {
  'category': string
  'launchedEpochMs': number | null
  'notes': string | null
  'score': number
  'verified': boolean
};

function buildFixture(): FixtureRecordType[] {
  return [
    { 'category': 'alpha', 'launchedEpochMs': Date.UTC(2024, 0, 1), 'notes': 'first', 'score': 10, 'verified': true },
    { 'category': 'alpha', 'launchedEpochMs': Date.UTC(2024, 1, 1), 'notes': null, 'score': 20, 'verified': false },
    { 'category': 'beta', 'launchedEpochMs': Date.UTC(2024, 2, 1), 'notes': null, 'score': 30, 'verified': true },
    { 'category': 'beta', 'launchedEpochMs': null, 'notes': null, 'score': 40, 'verified': false },
    { 'category': 'gamma', 'launchedEpochMs': Date.UTC(2024, 3, 1), 'notes': 'fifth', 'score': 50, 'verified': true }
  ];
}

it('detects string, number, date (EpochMs-suffixed), and boolean property types with correct cardinality', () => {
  const result = DataAnalyzer.analyze(buildFixture());

  const category = result.properties.get('category');
  assert.ok(category !== undefined);
  assert.equal(category.type, 'string');
  assert.equal(category.cardinality, 3);
  assert.equal(category.coverage, 1);

  const launched = result.properties.get('launchedEpochMs');
  assert.ok(launched !== undefined);
  assert.equal(launched.type, 'date');
  assert.equal(launched.nullCount, 1);
  assert.equal(launched.coverage, 0.8);
  assert.ok(launched.bounds !== undefined);
  assert.equal(launched.bounds.type, 'date');
  assert.equal(launched.bounds.minimum, Date.UTC(2024, 0, 1));
  assert.equal(launched.bounds.maximum, Date.UTC(2024, 3, 1));

  const score = result.properties.get('score');
  assert.ok(score !== undefined);
  assert.equal(score.type, 'number');
  assert.equal(score.cardinality, 5);
  assert.ok(score.bounds !== undefined);
  assert.equal(score.bounds.type, 'number');
  assert.equal(score.bounds.minimum, 10);
  assert.equal(score.bounds.maximum, 50);

  const verified = result.properties.get('verified');
  assert.ok(verified !== undefined);
  assert.equal(verified.type, 'boolean');
  assert.equal(verified.cardinality, 2);
});

it('excludes low-coverage properties from the groupable set and its recommendedGrouping', () => {
  const result = DataAnalyzer.analyze(buildFixture());

  // 'notes' is null in 3 of 5 records (coverage 0.4 < 0.5 threshold) — must be excluded.
  assert.equal(result.properties.has('notes'), false);
  assert.equal(result.recommendedGrouping.includes('notes'), false);
});

it('orders recommendedGrouping by ascending cardinality', () => {
  const result = DataAnalyzer.analyze(buildFixture());

  // category (3) < verified (2)? verified has cardinality 2, category has 3, score/launched have 5/4.
  const order = result.recommendedGrouping;
  const cardinalityOf = (name: string): number => {
    const info = result.properties.get(name);
    assert.ok(info !== undefined);
    return info.cardinality;
  };

  for (let i = 1; i < order.length; i++) {
    const previousName = order[i - 1];
    const currentName = order[i];
    assert.ok(previousName !== undefined && currentName !== undefined);
    assert.ok(cardinalityOf(previousName) <= cardinalityOf(currentName));
  }
});

it('respects excludeProperties option', () => {
  const result = DataAnalyzer.analyze(buildFixture(), { 'excludeProperties': ['category', 'score'] });

  assert.equal(result.properties.has('category'), false);
  assert.equal(result.properties.has('score'), false);
  assert.equal(result.properties.has('verified'), true);
});

it('returns zero groupable properties and empty recommendedGrouping for an empty dataset', () => {
  const result = DataAnalyzer.analyze([]);

  assert.equal(result.totalRecords, 0);
  assert.equal(result.properties.size, 0);
  assert.deepEqual(result.recommendedGrouping, []);
});
