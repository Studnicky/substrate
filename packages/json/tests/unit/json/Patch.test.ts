import assert from 'node:assert';
import { describe, it } from 'node:test';

import { Patch } from '../../../src/json/Patch.js';
import { PatchError } from '../../../src/errors/PatchError.js';

void describe('Patch', () => {
  void describe('Patch.add', () => {
    void it('adds a new property at a path', () => {
      const target: Record<string, unknown> = { a: 1 };
      Patch.add('/b', 2).apply(target);

      assert.strictEqual(target['b'], 2);
    });

    void it('creates intermediate objects as needed', () => {
      const target: Record<string, unknown> = {};
      Patch.add('/foo/bar', 42).apply(target);

      const foo = target['foo'] as Record<string, unknown>;

      assert.strictEqual(foo['bar'], 42);
    });
  });

  void describe('Patch.replace', () => {
    void it('replaces an existing value', () => {
      const target: Record<string, unknown> = { a: 1 };
      Patch.replace('/a', 99).apply(target);

      assert.strictEqual(target['a'], 99);
    });

    void it('throws PatchError when path does not exist', () => {
      const target: Record<string, unknown> = {};

      assert.throws(
        () => Patch.replace('/missing', 1).apply(target),
        PatchError
      );
    });

    void it('throws PatchError when a nested path does not exist (single-traversal semantics preserved)', () => {
      const target: Record<string, unknown> = { a: {} };

      assert.throws(
        () => Patch.replace('/a/missing', 1).apply(target),
        PatchError
      );
      assert.throws(
        () => Patch.replace('/missing/deeper', 1).apply(target),
        PatchError
      );
    });
  });

  void describe('Patch.remove', () => {
    void it('removes a property', () => {
      const target: Record<string, unknown> = { a: 1, b: 2 };
      Patch.remove('/a').apply(target);

      assert.ok(!('a' in target));
      assert.strictEqual(target['b'], 2);
    });

    void it('throws PatchError for a non-numeric array index and does not mutate the array', () => {
      const target: Record<string, unknown> = { items: [1, 2, 3] };

      assert.throws(() => Patch.remove('/items/bar').apply(target), PatchError);
      assert.deepStrictEqual(target['items'], [1, 2, 3]);
    });
  });

  void describe('Patch.copy', () => {
    void it('copies a value to a new path', () => {
      const target: Record<string, unknown> = { a: 1 };
      Patch.copy('/a', '/b').apply(target);

      assert.strictEqual(target['a'], 1);
      assert.strictEqual(target['b'], 1);
    });
  });

  void describe('Patch.move', () => {
    void it('moves a value from one path to another', () => {
      const target: Record<string, unknown> = { a: 1 };
      Patch.move('/a', '/b').apply(target);

      assert.ok(!('a' in target));
      assert.strictEqual(target['b'], 1);
    });
  });

  void describe('Patch.test', () => {
    const patchTestScenarios: Array<{
      description: string;
      value: number;
      shouldThrow: boolean;
    }> = [
      { description: 'Patch.test passes when value matches', value: 1, shouldThrow: false },
      { description: 'Patch.test throws PatchError when value does not match', value: 2, shouldThrow: true },
    ];
    for (const { description, value, shouldThrow } of patchTestScenarios) {
      void it(description, () => {
        const target: Record<string, unknown> = { a: 1 };
        if (shouldThrow) {
          assert.throws(() => Patch.test('/a', value).apply(target), PatchError);
        } else {
          assert.doesNotThrow(() => Patch.test('/a', value).apply(target));
        }
      });
    }

    void it('succeeds when object value is structurally equal but not reference-equal', () => {
      const target: Record<string, unknown> = { user: { name: 'a' } };

      assert.doesNotThrow(() => Patch.test('/user', { name: 'a' }).apply(target));
    });

    void it('succeeds when array value is structurally equal but not reference-equal', () => {
      const target: Record<string, unknown> = { tags: [1, 2, 3] };

      assert.doesNotThrow(() => Patch.test('/tags', [1, 2, 3]).apply(target));
    });

    void it('throws PatchError when object value differs structurally', () => {
      const target: Record<string, unknown> = { user: { name: 'a' } };

      assert.throws(() => Patch.test('/user', { name: 'b' }).apply(target), PatchError);
    });
  });

  void describe('Patch.combine', () => {
    void it('applies multiple operations sequentially', () => {
      const target: Record<string, unknown> = { a: 1 };
      Patch.combine(
        Patch.add('/b', 2),
        Patch.replace('/a', 10),
        Patch.remove('/b')
      ).apply(target);

      assert.strictEqual(target['a'], 10);
      assert.ok(!('b' in target));
    });
  });

  void describe('Patch.isEmpty', () => {
    const isEmptyScenarios: Array<{ description: string; patch: Patch; expected: boolean }> = [
      { description: 'isEmpty returns true for empty patch', patch: Patch.create([]), expected: true },
      { description: 'isEmpty returns false for non-empty patch', patch: Patch.add('/a', 1), expected: false },
    ];
    for (const { description, patch, expected } of isEmptyScenarios) {
      void it(description, () => { assert.strictEqual(patch.isEmpty(), expected); });
    }
  });

  void describe('Patch.toString', () => {
    void it('returns a readable description', () => {
      const p = Patch.combine(Patch.add('/a', 1), Patch.remove('/b'));
      const str = p.toString();

      assert.ok(str.includes('ADD'));
      assert.ok(str.includes('REMOVE'));
    });
  });

  void describe('Patch.fromPlain / toPlain', () => {
    void it('round-trips through plain representation', () => {
      const original = Patch.add('/x', 42);
      const plain = original.toPlain();
      const restored = Patch.fromPlain(plain);

      assert.deepStrictEqual(restored.getOperations(), original.getOperations());
    });
  });

  void describe('JSON Pointer path parsing', () => {
    void it('handles nested paths with multiple segments', () => {
      const target: Record<string, unknown> = {};
      Patch.add('/a/b/c', 'deep').apply(target);

      const a = target['a'] as Record<string, unknown>;
      const b = a['b'] as Record<string, unknown>;

      assert.strictEqual(b['c'], 'deep');
    });

    void it('handles escaped ~0 and ~1 in paths', () => {
      const target: Record<string, unknown> = { 'a/b': 1 };
      Patch.replace('/a~1b', 99).apply(target);

      assert.strictEqual(target['a/b'], 99);
    });
  });
});
