import assert from 'node:assert';
import { describe, it } from 'node:test';

import { Patch } from '../../../src/json/Patch.js';
import { PatchError } from '../../../src/errors/PatchError.js';

void describe('Patch', () => {
  void describe('add operation', () => {
    void it('adds a new property at a path', () => {
      const target: Record<string, unknown> = { a: 1 };
      Patch.create({ op: 'add', path: '/b', value: 2 }).apply(target);

      assert.strictEqual(target['b'], 2);
    });

    void it('creates intermediate objects as needed', () => {
      const target: Record<string, unknown> = {};
      Patch.create({ op: 'add', path: '/foo/bar', value: 42 }).apply(target);

      assert.deepStrictEqual(target, { foo: { bar: 42 } });
    });
  });

  void describe('Patch.create', () => {
    void it('rejects an operation outside the canonical operation enum', () => {
      assert.throws(() => Patch.create({ op: 'merge', path: '/a' }), PatchError);
    });

    void it('rejects an operation without its required path', () => {
      assert.throws(() => Patch.create({ op: 'add' }), PatchError);
    });

    void it('rejects undeclared operation properties', () => {
      assert.throws(() => Patch.create({ extra: true, op: 'add', path: '/a' }), PatchError);
    });

    const cyclicValue: Record<string, unknown> = {};
    cyclicValue['self'] = cyclicValue;

    const nonJsonValueScenarios: Array<{ 'description': string; 'value': unknown }> = [
      { 'description': 'a function', 'value': () => 1 },
      { 'description': 'a symbol', 'value': Symbol('value') },
      { 'description': 'a bigint', 'value': 1n },
      { 'description': 'NaN', 'value': Number.NaN },
      { 'description': 'infinity', 'value': Number.POSITIVE_INFINITY },
      { 'description': 'a cyclic object', 'value': cyclicValue }
    ];

    for (const { description, value } of nonJsonValueScenarios) {
      void it(`rejects ${description} as an operation value`, () => {
        assert.throws(() => Patch.create({ op: 'add', path: '/value', value }), PatchError);
      });
    }
  });

  void describe('replace operation', () => {
    void it('replaces an existing value', () => {
      const target: Record<string, unknown> = { a: 1 };
      Patch.create({ op: 'replace', path: '/a', value: 99 }).apply(target);

      assert.strictEqual(target['a'], 99);
    });

    void it('throws PatchError when path does not exist', () => {
      const target: Record<string, unknown> = {};

      assert.throws(
        () => Patch.create({ op: 'replace', path: '/missing', value: 1 }).apply(target),
        PatchError
      );
    });

    void it('throws PatchError when a nested path does not exist (single-traversal semantics preserved)', () => {
      const target: Record<string, unknown> = { a: {} };

      assert.throws(
        () => Patch.create({ op: 'replace', path: '/a/missing', value: 1 }).apply(target),
        PatchError
      );
      assert.throws(
        () => Patch.create({ op: 'replace', path: '/missing/deeper', value: 1 }).apply(target),
        PatchError
      );
    });
  });

  void describe('remove operation', () => {
    void it('removes a property', () => {
      const target: Record<string, unknown> = { a: 1, b: 2 };
      Patch.create({ op: 'remove', path: '/a' }).apply(target);

      assert.ok(!('a' in target));
      assert.strictEqual(target['b'], 2);
    });

    void it('throws PatchError for a non-numeric array index and does not mutate the array', () => {
      const target: Record<string, unknown> = { items: [1, 2, 3] };

      assert.throws(() => Patch.create({ op: 'remove', path: '/items/bar' }).apply(target), PatchError);
      assert.deepStrictEqual(target['items'], [1, 2, 3]);
    });
  });

  void describe('copy operation', () => {
    void it('copies a value to a new path', () => {
      const target: Record<string, unknown> = { a: 1 };
      Patch.create({ from: '/a', op: 'copy', path: '/b' }).apply(target);

      assert.strictEqual(target['a'], 1);
      assert.strictEqual(target['b'], 1);
    });
  });

  void describe('move operation', () => {
    void it('moves a value from one path to another', () => {
      const target: Record<string, unknown> = { a: 1 };
      Patch.create({ from: '/a', op: 'move', path: '/b' }).apply(target);

      assert.ok(!('a' in target));
      assert.strictEqual(target['b'], 1);
    });
  });

  void describe('test operation', () => {
    const patchTestScenarios: Array<{
      description: string;
      value: number;
      shouldThrow: boolean;
    }> = [
      { description: 'Patch.create applies a test operation when value matches', value: 1, shouldThrow: false },
      { description: 'Patch.create test operation throws PatchError when value does not match', value: 2, shouldThrow: true },
    ];
    for (const { description, value, shouldThrow } of patchTestScenarios) {
      void it(description, () => {
        const target: Record<string, unknown> = { a: 1 };
        if (shouldThrow) {
          assert.throws(() => Patch.create({ op: 'test', path: '/a', value }).apply(target), PatchError);
        } else {
          assert.doesNotThrow(() => Patch.create({ op: 'test', path: '/a', value }).apply(target));
        }
      });
    }

    void it('succeeds when object value is structurally equal but not reference-equal', () => {
      const target: Record<string, unknown> = { user: { name: 'a' } };

      assert.doesNotThrow(() => Patch.create({ op: 'test', path: '/user', value: { name: 'a' } }).apply(target));
    });

    void it('succeeds when array value is structurally equal but not reference-equal', () => {
      const target: Record<string, unknown> = { tags: [1, 2, 3] };

      assert.doesNotThrow(() => Patch.create({ op: 'test', path: '/tags', value: [1, 2, 3] }).apply(target));
    });

    void it('throws PatchError when object value differs structurally', () => {
      const target: Record<string, unknown> = { user: { name: 'a' } };

      assert.throws(() => Patch.create({ op: 'test', path: '/user', value: { name: 'b' } }).apply(target), PatchError);
    });
  });

  void describe('multiple operations', () => {
    void it('applies multiple operations sequentially', () => {
      const target: Record<string, unknown> = { a: 1 };
      Patch.create([
        { op: 'add', path: '/b', value: 2 },
        { op: 'replace', path: '/a', value: 10 },
        { op: 'remove', path: '/b' }
      ]).apply(target);

      assert.strictEqual(target['a'], 10);
      assert.ok(!('b' in target));
    });
  });

  void describe('Patch.isEmpty', () => {
    const isEmptyScenarios: Array<{ description: string; patch: Patch; expected: boolean }> = [
      { description: 'isEmpty returns true for empty patch', patch: Patch.create([]), expected: true },
      { description: 'isEmpty returns false for non-empty patch', patch: Patch.create({ op: 'add', path: '/a', value: 1 }), expected: false },
    ];
    for (const { description, patch, expected } of isEmptyScenarios) {
      void it(description, () => { assert.strictEqual(patch.isEmpty(), expected); });
    }
  });

  void describe('Patch.toString', () => {
    void it('returns a readable description', () => {
      const p = Patch.create([
        { op: 'add', path: '/a', value: 1 },
        { op: 'remove', path: '/b' }
      ]);
      const str = p.toString();

      assert.ok(str.includes('ADD'));
      assert.ok(str.includes('REMOVE'));
    });
  });

  void describe('Patch.operations', () => {
    void it('deeply isolates input and projected operations', () => {
      const value = { nested: { count: 1 } };
      const input = [{ op: 'add', path: '/value', value }];
      const patch = Patch.create(input);

      value.nested.count = 2;
      input[0]!.path = '/changed';
      const first = patch.operations;
      const firstValue = first[0]?.value;
      assert.ok(firstValue !== null && typeof firstValue === 'object' && !Array.isArray(firstValue));
      Reflect.set(Reflect.get(firstValue, 'nested'), 'count', 3);

      const target: Record<string, unknown> = {};
      patch.apply(target);
      const appliedValue = target['value'];
      assert.ok(appliedValue !== null && typeof appliedValue === 'object' && !Array.isArray(appliedValue));
      Reflect.set(Reflect.get(appliedValue, 'nested'), 'count', 4);

      assert.deepStrictEqual(patch.operations, [
        { op: 'add', path: '/value', value: { nested: { count: 1 } } }
      ]);
      const nextTarget: Record<string, unknown> = {};
      patch.apply(nextTarget);
      assert.deepStrictEqual(nextTarget, { value: { nested: { count: 1 } } });
    });
  });

  void describe('JSON Pointer path parsing', () => {
    void it('handles nested paths with multiple segments', () => {
      const target: Record<string, unknown> = {};
      Patch.create({ op: 'add', path: '/a/b/c', value: 'deep' }).apply(target);

      assert.deepStrictEqual(target, { a: { b: { c: 'deep' } } });
    });

    void it('handles escaped ~0 and ~1 in paths', () => {
      const target: Record<string, unknown> = { 'a/b': 1 };
      Patch.create({ op: 'replace', path: '/a~1b', value: 99 }).apply(target);

      assert.strictEqual(target['a/b'], 99);
    });
  });
});
