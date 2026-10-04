/**
 * basic-drilldown — group an array of records into a multi-level tree using
 * propertyPriority to fix the drilldown order. Nesting depth is bounded only
 * by how many properties are given; the same shape supports arbitrarily deep
 * per-value rule trees via DrilldownRulesEntity.
 *
 * Run: npx tsx packages/drilldown/examples/basic-drilldown.ts
 */

import assert from 'node:assert/strict';

import type { GroupNodeInterface } from '../src/interfaces/GroupNodeInterface.js';

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
    const firstRegion = DrilldownDemo.firstChild(tree);
    const firstCategory = DrilldownDemo.firstChild(firstRegion);

    console.log(`Root splits into ${DrilldownDemo.childCount(tree)} region groups`);
    console.log(`First region "${firstRegion?.value}" splits into ${DrilldownDemo.childCount(firstRegion)} category groups`);
    console.log(`First category "${firstCategory?.value}" splits into ${DrilldownDemo.childCount(firstCategory)} status groups`);

    return {
      'categoryGroupCount': DrilldownDemo.childCount(firstRegion),
      'regionGroupCount': DrilldownDemo.childCount(tree),
      'statusGroupCount': DrilldownDemo.childCount(firstCategory)
    };
  }

  private static childCount(node: GroupNodeInterface | undefined): number {
    const result = node?.grouped?.length ?? 0;
    return result;
  }

  private static firstChild(node: GroupNodeInterface | undefined): GroupNodeInterface | undefined {
    const result = node?.grouped?.[0] ?? undefined;
    return result;
  }
}

const results = DrilldownDemo.run();
// #endregion usage

assert.equal(typedRules.group?.[0]?.property, 'category', 'expected a typed reusable group rule');
assert.equal(results.regionGroupCount, 2, 'expected 2 region groups (east, west)');
assert.ok(results.categoryGroupCount > 0, 'expected region to split into category groups');
assert.ok(results.statusGroupCount > 0, 'expected category to split into status groups');

console.log('basic-drilldown: all assertions passed');
