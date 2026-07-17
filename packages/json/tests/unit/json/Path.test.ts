import assert from 'node:assert';
import { describe, it } from 'node:test';

import { Path } from '../../../src/json/Path.js';

void describe('Path', () => {
  void describe('Path.toAccess', () => {
    const toAccessScenarios: Array<{ description: string; input: string; expected: string }> = [
      { description: 'converts nested path to dot notation', input: '/items/0/quantity', expected: 'items[0].quantity' },
      { description: 'converts simple path to dot notation', input: '/a/b/c', expected: 'a.b.c' },
      { description: 'converts numeric segment to bracket notation', input: '/arr/0', expected: 'arr[0]' },
      { description: 'converts numeric segment with trailing property', input: '/arr/0/name', expected: 'arr[0].name' },
      { description: 'uses bracket notation for special characters', input: '/foo bar', expected: '["foo bar"]' },
      { description: 'unescapes ~1 and uses bracket notation', input: '/a~1b', expected: '["a/b"]' },
      { description: 'unescapes ~0 and uses bracket notation', input: '/m~0n', expected: '["m~n"]' },
      { description: 'returns empty string for root pointer (empty string)', input: '', expected: '' },
      { description: 'returns empty string for root pointer (slash)', input: '/', expected: '' },
    ];
    for (const { description, input, expected } of toAccessScenarios) {
      void it(description, () => { assert.strictEqual(Path.toAccess(input), expected); });
    }
  });

  void describe('Path.get', () => {
    const obj = {
      user: {
        name: 'Alice',
        address: { city: 'Wonderland' },
        tags: ['admin', 'user']
      },
      items: [{ id: 1 }, { id: 2 }]
    };

    const getScenarios: Array<{ description: string; path: string; expected: unknown }> = [
      { description: 'gets a top-level property', path: 'user', expected: obj.user },
      { description: 'gets a nested property (name)', path: 'user.name', expected: 'Alice' },
      { description: 'gets a nested property (city)', path: 'user.address.city', expected: 'Wonderland' },
      { description: 'gets first array element', path: 'user.tags[0]', expected: 'admin' },
      { description: 'gets second array element', path: 'user.tags[1]', expected: 'user' },
      { description: 'returns undefined for missing path', path: 'user.missing', expected: undefined },
      { description: 'returns undefined for deeply missing path', path: 'missing.path', expected: undefined },
      { description: 'returns undefined for __proto__', path: '__proto__', expected: undefined },
      { description: 'returns undefined for constructor', path: 'constructor', expected: undefined },
      { description: 'returns entire object for empty path', path: '', expected: obj },
    ];
    for (const { description, path, expected } of getScenarios) {
      void it(description, () => { assert.deepStrictEqual(Path.get(obj, path), expected); });
    }

    void it('returns undefined when maxDepth is exceeded', () => {
      assert.strictEqual(Path.get(obj, 'user.address.city', { maxDepth: 1 }), undefined);
    });

    void it('returns wildcard sentinel for [*] paths', () => {
      const result = Path.get(obj, 'items[*]');

      assert.ok(result !== null && typeof result === 'object');
      const sentinel = result as { isWildcard: boolean; array: unknown[] };

      assert.strictEqual(sentinel.isWildcard, true);
      assert.deepStrictEqual(sentinel.array, obj.items);
    });

    void describe('bracket-quoted key safety', () => {
      const bracketDangerousScenarios: Array<{ description: string; path: string }> = [
        { description: 'rejects bracket-quoted __proto__', path: '["__proto__"]["polluted"]' },
        { description: 'rejects bracket-quoted constructor', path: '["constructor"]["prototype"]' },
        { description: 'rejects bracket-quoted prototype', path: '["prototype"]' },
      ];
      for (const { description, path } of bracketDangerousScenarios) {
        void it(description, () => {
          const target: Record<string, unknown> = {};
          assert.strictEqual(Path.get(target, path), undefined);
        });
      }

      void it('still resolves a safe bracket-quoted key', () => {
        const target = { 'special.key': { nested: 'value' } };

        assert.strictEqual(Path.get(target, '["special.key"]["nested"]'), 'value');
      });
    });

    void describe('non-numeric bracket array index', () => {
      const invalidIndexScenarios: Array<{ description: string; path: string }> = [
        { description: 'returns undefined for a non-numeric index', path: 'user.tags[oops]' },
        { description: 'returns undefined for a fractional index', path: 'user.tags[1.5]' },
        { description: 'returns undefined for a negative index', path: 'user.tags[-1]' },
      ];
      for (const { description, path } of invalidIndexScenarios) {
        void it(description, () => {
          assert.strictEqual(Path.get(obj, path), undefined);
        });
      }

      void it('still resolves a valid numeric index', () => {
        assert.strictEqual(Path.get(obj, 'user.tags[0]'), 'admin');
      });
    });
  });
});
