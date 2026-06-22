import assert from 'node:assert';
import { describe, it } from 'node:test';

import { Merge } from '../../../src/json/Merge.js';

void describe('Merge', () => {
  void describe('Merge.deep', () => {
    void it('overlay wins on primitive conflict', () => {
      const result = Merge.deep({ a: 1, b: 2 }, { b: 99 });

      assert.strictEqual(result.a, 1);
      assert.strictEqual(result.b, 99);
    });

    void it('base value preserved when overlay key is absent', () => {
      const result = Merge.deep({ a: 1, b: 2 }, { c: 3 });

      assert.strictEqual(result.a, 1);
      assert.strictEqual(result.b, 2);
      assert.strictEqual(result.c, 3);
    });

    void it('recursively merges nested objects', () => {
      const base = { a: { x: 1, y: 2 }, b: 3 };
      const overlay = { a: { y: 99, z: 100 } };
      const result = Merge.deep(base, overlay);

      assert.strictEqual(result.a.x, 1);
      assert.strictEqual(result.a.y, 99);
      assert.strictEqual(result.a.z, 100);
      assert.strictEqual(result.b, 3);
    });

    void it('arrays are replaced atomically by overlay', () => {
      const result = Merge.deep({ arr: [1, 2, 3] }, { arr: [4, 5] });

      assert.deepStrictEqual(result.arr, [4, 5]);
    });

    void it('undefined overlay value preserves base', () => {
      const result = Merge.deep({ a: 1 }, { a: undefined });

      assert.strictEqual(result.a, 1);
    });

    void it('null is treated as a primitive (overlay wins)', () => {
      const result = Merge.deep({ a: { x: 1 } }, { a: null });

      assert.strictEqual(result.a, null);
    });

    void it('produces identical hidden class for same-shape inputs', () => {
      const r1 = Merge.deep({ b: 1, a: 2 }, { c: 3 });
      const r2 = Merge.deep({ a: 10, b: 20 }, { c: 30 });

      // Alphabetical write order: a, b, c
      assert.deepStrictEqual(Object.keys(r1), ['a', 'b', 'c']);
      assert.deepStrictEqual(Object.keys(r2), ['a', 'b', 'c']);
    });
  });
});
