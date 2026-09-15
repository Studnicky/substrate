/**
 * basic-drilldown — group an array of records into a multi-level tree using
 * propertyPriority to fix the drilldown order. Nesting depth is bounded only
 * by how many properties are given; the same shape supports arbitrarily deep
 * per-value rule trees via DrilldownRulesEntity.
 *
 * Run: npx tsx packages/drilldown/examples/basic-drilldown.ts
 */

import assert from 'node:assert/strict';

import { DrillDown, DrilldownRulesEntity } from '../src/index.js';
// #region usage
import { OrdersFixture } from './fixtures/OrdersFixture.js';

// #region explicit-rule-types
const reusableRules: DrilldownRulesEntity.Type = {
  'group': [{ 'property': 'category', 'values': [{ 'match': 'alpha', 'type': 'string' }] }]
};
const typedRules = DrilldownRulesEntity.intake(reusableRules);
// #endregion explicit-rule-types

class DrilldownDemo {
  static run(): { 'categoryGroupCount': number; 'regionGroupCount': number; 'statusGroupCount': number } {
    const drillDown = new DrillDown();

    // Three levels deep: region -> category -> status
    const tree = drillDown.group(OrdersFixture.orders, {
      'minimumGroupSize': 1,
      'propertyPriority': ['region', 'category', 'status']
    });

    console.log(`Root splits into ${tree.grouped?.length ?? 0} region groups`);

    const firstRegion = tree.grouped?.[0];
    console.log(`First region "${firstRegion?.value}" splits into ${firstRegion?.grouped?.length ?? 0} category groups`);

    const firstCategory = firstRegion?.grouped?.[0];
    console.log(`First category "${firstCategory?.value}" splits into ${firstCategory?.grouped?.length ?? 0} status groups`);

    return {
      'categoryGroupCount': firstRegion?.grouped?.length ?? 0,
      'regionGroupCount': tree.grouped?.length ?? 0,
      'statusGroupCount': firstCategory?.grouped?.length ?? 0
    };
  }
}

const results = DrilldownDemo.run();
// #endregion usage

assert.equal(typedRules.group?.[0]?.property, 'category', 'expected a typed reusable group rule');
assert.equal(results.regionGroupCount, 2, 'expected 2 region groups (east, west)');
assert.ok(results.categoryGroupCount > 0, 'expected region to split into category groups');
assert.ok(results.statusGroupCount > 0, 'expected category to split into status groups');

console.log('basic-drilldown: all assertions passed');
