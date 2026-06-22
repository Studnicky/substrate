import assert from 'node:assert';
import { describe, it } from 'node:test';

import { Sort } from '../../../src/json/Sort.js';

void describe('Sort', () => {
  void describe('Sort.natural', () => {
    void it('sorts numeric substrings numerically', () => {
      const files = ['file1', 'file10', 'file2', 'file20'];
      const sorted = [...files].sort(Sort.natural);

      assert.deepStrictEqual(sorted, ['file1', 'file2', 'file10', 'file20']);
    });

    void it('sorts plain strings alphabetically', () => {
      const words = ['banana', 'apple', 'cherry'];
      const sorted = [...words].sort(Sort.natural);

      assert.deepStrictEqual(sorted, ['apple', 'banana', 'cherry']);
    });
  });

  void describe('Sort.shortestFirst', () => {
    void it('sorts by length ascending, ties lexicographically', () => {
      const terms = ['property', 'id', 'type', 'name'];
      const sorted = [...terms].sort(Sort.shortestFirst);

      assert.deepStrictEqual(sorted, ['id', 'name', 'type', 'property']);
    });

    void it('returns 0 for equal strings', () => {
      assert.strictEqual(Sort.shortestFirst('abc', 'abc'), 0);
    });
  });

  void describe('Sort.longestFirst', () => {
    void it('sorts by length descending, ties lexicographically', () => {
      const terms = ['id', 'type', 'property', 'name'];
      const sorted = [...terms].sort(Sort.longestFirst);

      // 'property'(8) > 'type'/'name'(4) > 'id'(2)
      // Ties at length 4: negated shortestFirst means 'name'<'type' ascending → 'type' first descending
      assert.deepStrictEqual(sorted, ['property', 'type', 'name', 'id']);
    });

    void it('is the inverse of shortestFirst', () => {
      assert.strictEqual(Sort.longestFirst('abc', 'de'), Sort.shortestFirst('de', 'abc'));
    });
  });
});
