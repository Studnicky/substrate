import assert from 'node:assert';
import { describe, it } from 'node:test';

import { Draft } from '../../../src/json/Draft.js';
import { Patch } from '../../../src/json/Patch.js';

void describe('Draft', () => {
  void describe('Draft.produce', () => {
    void it('mutating a top-level field produces a new object with that field changed', () => {
      const base = { 'a': 1, 'b': 2 };
      const next = Draft.produce(base, (draft) => {
        draft.a = 99;
      });

      assert.strictEqual(next.a, 99);
      assert.strictEqual(next.b, 2);
      assert.notStrictEqual(next, base);
    });

    void it('leaves base untouched (deep-equal check base is unmodified)', () => {
      const base = { 'a': 1, 'nested': { 'value': 2 } };
      const snapshot = { 'a': 1, 'nested': { 'value': 2 } };

      Draft.produce(base, (draft) => {
        draft.a = 42;
        draft.nested.value = 99;
      });

      assert.deepStrictEqual(base, snapshot);
    });

    void it('mutating a nested field keeps the same reference for untouched sibling branches', () => {
      const base = {
        'touched': { 'x': 1 },
        'untouched': { 'y': 2 }
      };

      const next = Draft.produce(base, (draft) => {
        draft.touched.x = 100;
      });

      assert.notStrictEqual(next, base);
      assert.notStrictEqual(next.touched, base.touched);
      assert.strictEqual(next.touched.x, 100);
      // Structural sharing — untouched branch is the SAME reference.
      assert.strictEqual(next.untouched, base.untouched);
    });

    void it('supports array push through the draft', () => {
      const base = { 'items': [1, 2, 3] };
      const next = Draft.produce(base, (draft) => {
        draft.items.push(4);
      });

      assert.deepStrictEqual(next.items, [1, 2, 3, 4]);
      assert.notStrictEqual(next.items, base.items);
      assert.deepStrictEqual(base.items, [1, 2, 3]);
    });

    void it('supports array splice through the draft', () => {
      const base = { 'items': [1, 2, 3, 4] };
      const next = Draft.produce(base, (draft) => {
        draft.items.splice(1, 2, 'x', 'y', 'z');
      });

      assert.deepStrictEqual(next.items, [1, 'x', 'y', 'z', 4]);
      assert.deepStrictEqual(base.items, [1, 2, 3, 4]);
    });

    void it('supports array index assignment through the draft', () => {
      const base = { 'items': [1, 2, 3] };
      const next = Draft.produce(base, (draft) => {
        draft.items[1] = 99;
      });

      assert.deepStrictEqual(next.items, [1, 99, 3]);
      assert.deepStrictEqual(base.items, [1, 2, 3]);
      assert.notStrictEqual(next.items, base.items);
    });

    void it('a no-op recipe returns the same reference as base', () => {
      const base = { 'a': 1, 'nested': { 'value': 2 } };
      const next = Draft.produce(base, () => {
        // reads only, no writes
      });

      assert.strictEqual(next, base);
    });

    void it('a no-op recipe that only reads nested values still returns the same reference', () => {
      const base = { 'a': 1, 'nested': { 'value': 2 } };
      const next = Draft.produce(base, (draft) => {
        void draft.nested.value;
      });

      assert.strictEqual(next, base);
    });

    void it('memoizes nested proxies so repeated access returns the same proxy instance', () => {
      const base = { 'nested': { 'value': 1 } };
      let first: unknown;
      let second: unknown;

      Draft.produce(base, (draft) => {
        first = draft.nested;
        second = draft.nested;
      });

      assert.strictEqual(first, second);
    });

    void it('passes non-plain values (Date, class instances) through as direct references', () => {
      class Widget {
        public readonly id = 'w1';
      }

      const widget = new Widget();
      const createdAt = new Date('2024-01-01');
      const base = { 'createdAt': createdAt, 'widget': widget, 'label': 'a' };

      const next = Draft.produce(base, (draft) => {
        draft.label = 'b';
      });

      assert.strictEqual(next.createdAt, createdAt);
      assert.strictEqual(next.widget, widget);
      assert.strictEqual(next.label, 'b');
    });

    void it('supports deleting a property through the draft', () => {
      const base: { 'a': number; 'b'?: number } = { 'a': 1, 'b': 2 };
      const next = Draft.produce(base, (draft) => {
        delete draft.b;
      });

      assert.ok(!('b' in next));
      assert.strictEqual(base.b, 2);
    });
  });

  void describe('Draft.producePatch', () => {
    void it('round-trips through Patch.apply to reproduce next exactly', () => {
      const base = { 'count': 1, 'meta': { 'label': 'draft' }, 'tags': ['a', 'b'] };

      const { next, patch } = Draft.producePatch(base, (draft) => {
        draft.count = 2;
        draft.meta.label = 'published';
        draft.tags.push('c');
      });

      const target: Record<string, unknown> = JSON.parse(JSON.stringify(base)) as Record<string, unknown>;

      Patch.create(patch).apply(target);

      assert.deepStrictEqual(target, next);
    });

    void it('round-trips a property removal', () => {
      const base: { 'a': number; 'b'?: number } = { 'a': 1, 'b': 2 };

      const { next, patch } = Draft.producePatch(base, (draft) => {
        delete draft.b;
      });

      const target: Record<string, unknown> = JSON.parse(JSON.stringify(base)) as Record<string, unknown>;

      Patch.create(patch).apply(target);

      assert.deepStrictEqual(target, next);
      assert.ok(!('b' in target));
    });

    void it('round-trips a property addition', () => {
      const base: Record<string, unknown> = { 'a': 1 };

      const { next, patch } = Draft.producePatch(base, (draft) => {
        (draft as Record<string, unknown>).b = 2;
      });

      const target: Record<string, unknown> = JSON.parse(JSON.stringify(base)) as Record<string, unknown>;

      Patch.create(patch).apply(target);

      assert.deepStrictEqual(target, next);
    });

    void it('produces an empty patch for a no-op recipe', () => {
      const base = { 'a': 1 };
      const { next, patch } = Draft.producePatch(base, () => {});

      assert.strictEqual(next, base);
      assert.deepStrictEqual(patch, []);
    });
  });
});
