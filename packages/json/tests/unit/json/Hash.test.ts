import assert from 'node:assert';
import { describe, it } from 'node:test';

import { Hash } from '../../../src/json/Hash.js';
import { StructuralHash } from '../../../src/json/StructuralHash.js';

void describe('Hash', () => {
  void describe('Hash.value', () => {
    void it('returns a hex string', () => {
      const result = Hash.value({ a: 1 });

      assert.match(result, /^[0-9a-f]{8}$/u);
    });

    void it('produces the same hash for identical values', () => {
      assert.strictEqual(Hash.value({ a: 1, b: 2 }), Hash.value({ a: 1, b: 2 }));
    });

    void it('is insensitive to object key insertion order', () => {
      const h1 = Hash.value({ a: 1, b: 2 });
      const h2 = Hash.value({ b: 2, a: 1 });

      assert.strictEqual(h1, h2);
    });

    void it('produces different hashes for different values', () => {
      assert.notStrictEqual(Hash.value({ a: 1 }), Hash.value({ a: 2 }));
      assert.notStrictEqual(Hash.value([1, 2]), Hash.value([1, 3]));
    });

    const primitiveHashScenarios: Array<{ description: string; input: unknown }> = [
      { description: 'returns a string for null', input: null },
      { description: 'returns a string for a number', input: 42 },
      { description: 'returns a string for a string', input: 'hello' },
    ];
    for (const { description, input } of primitiveHashScenarios) {
      void it(description, () => { assert.ok(typeof Hash.value(input) === 'string'); });
    }

    void it('handles nested structures', () => {
      const h1 = Hash.value({ a: { b: { c: 1 } } });
      const h2 = Hash.value({ a: { b: { c: 2 } } });

      assert.notStrictEqual(h1, h2);
    });

    void it('hashes Map, Set, Date and {} distinctly', () => {
      const hashes = [
        Hash.value(new Map([['a', 1]])),
        Hash.value(new Set(['a'])),
        Hash.value(new Date(0)),
        Hash.value({}),
      ];

      assert.strictEqual(new Set(hashes).size, hashes.length);
    });

    void it('is insensitive to Map/Set insertion order', () => {
      const m1 = Hash.value(new Map([['a', 1], ['b', 2]]));
      const m2 = Hash.value(new Map([['b', 2], ['a', 1]]));

      assert.strictEqual(m1, m2);

      const s1 = Hash.value(new Set(['a', 'b']));
      const s2 = Hash.value(new Set(['b', 'a']));

      assert.strictEqual(s1, s2);
    });
  });
});

void describe('StructuralHash', () => {
  void describe('StructuralHash.of', () => {
    void it('produces the same hash for schemas differing only in metadata', () => {
      const s1 = {
        type: 'object',
        properties: { name: { type: 'string' } }
      };
      const s2 = {
        $id: 'https://example.com/schema.json',
        description: 'A schema with the same structure',
        title: 'My Schema',
        type: 'object',
        properties: { name: { type: 'string' } }
      };

      assert.strictEqual(StructuralHash.of(s1), StructuralHash.of(s2));
    });

    void it('produces different hashes for structurally different schemas', () => {
      const s1 = { type: 'object', properties: { name: { type: 'string' } } };
      const s2 = { type: 'object', properties: { name: { type: 'number' } } };

      assert.notStrictEqual(StructuralHash.of(s1), StructuralHash.of(s2));
    });
  });
});
