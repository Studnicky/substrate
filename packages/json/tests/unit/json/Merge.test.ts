import assert from 'node:assert';
import { describe, it } from 'node:test';

import { Merge } from '../../../src/json/Merge.js';

void describe('Merge', () => {
  void describe('Merge.deep', () => {
    void it('overlay wins on primitive conflict', () => {
      const result = Merge.deep({ a: 1, b: 2 }, { b: 99 });

      assert.deepStrictEqual(result, { a: 1, b: 99 });
    });

    void it('base value preserved when overlay key is absent', () => {
      const result = Merge.deep({ a: 1, b: 2 }, { c: 3 });

      assert.deepStrictEqual(result, { a: 1, b: 2, c: 3 });
    });

    void it('recursively merges nested objects', () => {
      const base = { a: { x: 1, y: 2 }, b: 3 };
      const overlay = { a: { y: 99, z: 100 } };
      const result = Merge.deep(base, overlay);

      assert.deepStrictEqual(result, { a: { x: 1, y: 99, z: 100 }, b: 3 });
    });

    void it('arrays are replaced atomically by overlay', () => {
      const result = Merge.deep({ arr: [1, 2, 3] }, { arr: [4, 5] });

      assert.deepStrictEqual(result, { arr: [4, 5] });
    });

    void it('isolates merged output from later base and overlay mutations', () => {
      const base = {
        baseOnly: { count: 1 },
        nested: { baseItems: [{ id: 1 }] }
      };
      const overlay = {
        nested: { overlayItems: [{ id: 2 }] },
        overlayOnly: { count: 2 }
      };
      const result = Merge.deep(base, overlay);

      base.baseOnly.count = 10;
      const [baseItem] = base.nested.baseItems;
      const [overlayItem] = overlay.nested.overlayItems;
      assert.ok(baseItem !== undefined);
      assert.ok(overlayItem !== undefined);
      baseItem.id = 10;
      overlayItem.id = 20;
      overlay.overlayOnly.count = 20;

      assert.deepStrictEqual(result, {
        baseOnly: { count: 1 },
        nested: { baseItems: [{ id: 1 }], overlayItems: [{ id: 2 }] },
        overlayOnly: { count: 2 }
      });
    });

    void it('isolates base and overlay inputs from later output mutations', () => {
      const base = { baseOnly: { count: 1 }, items: [{ id: 1 }] };
      const overlay = { overlayOnly: { count: 2 }, items: [{ id: 2 }] };
      const result = Merge.deep(base, overlay);
      const resultBaseOnly = result.baseOnly;
      const resultOverlayOnly = result.overlayOnly;
      const resultItems = result.items;

      assert.ok(typeof resultBaseOnly === 'object' && resultBaseOnly !== null);
      assert.ok(typeof resultOverlayOnly === 'object' && resultOverlayOnly !== null);
      assert.ok(Array.isArray(resultItems));
      Reflect.set(resultBaseOnly, 'count', 10);
      Reflect.set(resultOverlayOnly, 'count', 20);
      resultItems.push({ id: 3 });
      const firstResultItem = resultItems[0];
      assert.ok(typeof firstResultItem === 'object' && firstResultItem !== null);
      Reflect.set(firstResultItem, 'id', 20);

      assert.deepStrictEqual(base, { baseOnly: { count: 1 }, items: [{ id: 1 }] });
      assert.deepStrictEqual(overlay, { overlayOnly: { count: 2 }, items: [{ id: 2 }] });
    });

    void it('undefined overlay value preserves base', () => {
      const result = Merge.deep({ a: 1 }, { a: undefined });

      assert.deepStrictEqual(result, { a: 1 });
    });

    void it('null is treated as a primitive (overlay wins)', () => {
      const result = Merge.deep({ a: { x: 1 } }, { a: null });

      assert.deepStrictEqual(result, { a: null });
    });

    void it('replaces arrays atomically when arrays are merged directly', () => {
      const result = Merge.deep([1, 2], [3, 4]);

      assert.deepStrictEqual(result, [3, 4]);
    });

    void it('returns the scalar overlay when scalar values are merged directly', () => {
      const result = Merge.deep(1, 'overlay');

      assert.strictEqual(result, 'overlay');
    });

    void it('treats non-plain objects as atomic overlay values', () => {
      const overlay = new Date(0);
      const result = Merge.deep({ a: 1 }, overlay);

      assert.strictEqual(result, overlay);
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
