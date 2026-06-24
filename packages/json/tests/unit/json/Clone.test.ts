import assert from 'node:assert';
import { describe, it } from 'node:test';

import { Clone } from '../../../src/json/Clone.js';

void describe('Clone', () => {
  void describe('Clone.deep', () => {
    const primitiveScenarios: Array<{ description: string; input: unknown; expected: unknown }> = [
      { description: 'clones number by value', input: 42, expected: 42 },
      { description: 'clones string by value', input: 'hello', expected: 'hello' },
      { description: 'clones null by value', input: null, expected: null },
    ];
    for (const { description, input, expected } of primitiveScenarios) {
      void it(description, () => { assert.strictEqual(Clone.deep(input), expected); });
    }

    void it('clones arrays without sharing references', () => {
      const original = [1, [2, 3], { a: 4 }];
      const cloned = Clone.deep(original);

      assert.deepStrictEqual(cloned, original);
      assert.notStrictEqual(cloned, original);
      assert.notStrictEqual(cloned[1], original[1]);
    });

    void it('clones nested objects', () => {
      const original = { a: 1, b: { c: 2 } };
      const cloned = Clone.deep(original);

      assert.deepStrictEqual(cloned, original);
      assert.notStrictEqual(cloned, original);
      assert.notStrictEqual(cloned.b, original.b);
    });

    void it('clones Maps with deep-cloned values', () => {
      const original = new Map([['key', { value: 1 }]]);
      const cloned = Clone.deep(original);

      assert.notStrictEqual(cloned, original);
      assert.strictEqual(cloned.size, 1);
      const orig = original.get('key');
      const clone = cloned.get('key');

      assert.notStrictEqual(clone, orig);
      assert.deepStrictEqual(clone, orig);
    });

    void it('clones Sets', () => {
      const original = new Set([1, 2, 3]);
      const cloned = Clone.deep(original);

      assert.notStrictEqual(cloned, original);
      assert.ok(cloned.has(1));
      assert.ok(cloned.has(2));
      assert.ok(cloned.has(3));
    });

    void it('clones Date objects', () => {
      const original = new Date('2024-06-01');
      const cloned = Clone.deep(original);

      assert.notStrictEqual(cloned, original);
      assert.strictEqual(cloned.getTime(), original.getTime());
    });

    void it('mutations to clone do not affect original', () => {
      const original = { a: 1, b: { c: 2 } };
      const cloned = Clone.deep(original);

      cloned.b.c = 99;
      assert.strictEqual(original.b.c, 2);
    });
  });

  void describe('Clone.shallow', () => {
    void it('creates a new object with same property values', () => {
      const original = { a: 1, b: { c: 2 } };
      const cloned = Clone.shallow(original);

      assert.notStrictEqual(cloned, original);
      assert.strictEqual(cloned.a, 1);
      // Shallow — nested objects share reference
      assert.strictEqual(cloned.b, original.b);
    });
  });
});
