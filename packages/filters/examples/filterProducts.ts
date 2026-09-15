/** filterProducts — evaluate a declarative product filter. Run: npx tsx examples/filterProducts.ts */

// #region usage
import { FilterEngine, FilterMode } from '@studnicky/filters/node';
import assert from 'node:assert/strict';

const engine = new FilterEngine({
  'conditions': [
    { 'operator': 'STRING.EQUALS', 'path': 'status', 'value': 'active' },
    { 'operator': 'NUMBER.GREATER_EQUAL', 'path': 'inventory', 'value': 1 }
  ],
  'gate': 'CORE.AND',
  'mode': FilterMode.CORE.WHITELIST
});

const inStock = engine.evaluate({ 'inventory': 8, 'status': 'active' });
const soldOut = engine.evaluate({ 'inventory': 0, 'status': 'active' });

console.log({ 'inStock': inStock.valid, 'soldOut': soldOut.valid });
// #endregion usage

assert.equal(inStock.valid, true);
assert.equal(soldOut.valid, false);
console.log('filterProducts: all assertions passed');
