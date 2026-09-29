/** filterProducts — keep sellable Northstar Books catalogue entries in a storefront result. Run: npx tsx examples/filterProducts.ts */

// #region usage
import { FilterEngine, FilterMode } from '@studnicky/filters/node';
import assert from 'node:assert/strict';

const engine = new FilterEngine({
  'conditions': [
    { 'operator': 'STRING.EQUALS', 'path': 'catalogueStatus', 'value': 'listed' },
    { 'operator': 'NUMBER.GREATER_EQUAL', 'path': 'availableCopies', 'value': 1 }
  ],
  'gate': 'CORE.AND',
  'mode': FilterMode.CORE.WHITELIST
});

const sellableBook = engine.evaluate({ 'availableCopies': 8, 'catalogueStatus': 'listed', 'isbn': '978-0-14-118776-1', 'title': 'The Left Hand of Darkness' });
const unavailableBook = engine.evaluate({ 'availableCopies': 0, 'catalogueStatus': 'listed', 'isbn': '978-0-06-112008-4', 'title': 'To Kill a Mockingbird' });

console.log({ 'sellableBook': sellableBook.valid, 'unavailableBook': unavailableBook.valid });
// #endregion usage

assert.equal(sellableBook.valid, true);
assert.equal(unavailableBook.valid, false);
console.log('filterProducts: all assertions passed');
