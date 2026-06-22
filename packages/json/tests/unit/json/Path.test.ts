import assert from 'node:assert';
import { describe, it } from 'node:test';

import { Path } from '../../../src/json/Path.js';

void describe('Path', () => {
  void describe('Path.toAccess', () => {
    void it('converts JSON Pointer to access notation', () => {
      assert.strictEqual(Path.toAccess('/items/0/quantity'), 'items[0].quantity');
      assert.strictEqual(Path.toAccess('/a/b/c'), 'a.b.c');
    });

    void it('converts numeric segments to bracket notation', () => {
      assert.strictEqual(Path.toAccess('/arr/0'), 'arr[0]');
      assert.strictEqual(Path.toAccess('/arr/0/name'), 'arr[0].name');
    });

    void it('handles special characters via bracket notation', () => {
      assert.strictEqual(Path.toAccess('/foo bar'), '["foo bar"]');
    });

    void it('unescapes JSON Pointer ~0 and ~1 sequences', () => {
      // /a~1b → segment "a/b" — contains slash, not a valid identifier → bracket notation
      assert.strictEqual(Path.toAccess('/a~1b'), '["a/b"]');
      // /m~0n → segment "m~n" — tilde is not a valid identifier character → bracket notation
      assert.strictEqual(Path.toAccess('/m~0n'), '["m~n"]');
    });

    void it('returns empty string for root pointers', () => {
      assert.strictEqual(Path.toAccess(''), '');
      assert.strictEqual(Path.toAccess('/'), '');
    });
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

    void it('gets a top-level property', () => {
      assert.deepStrictEqual(Path.get(obj, 'user'), obj.user);
    });

    void it('gets a nested property', () => {
      assert.strictEqual(Path.get(obj, 'user.name'), 'Alice');
      assert.strictEqual(Path.get(obj, 'user.address.city'), 'Wonderland');
    });

    void it('gets an array element by index', () => {
      assert.strictEqual(Path.get(obj, 'user.tags[0]'), 'admin');
      assert.strictEqual(Path.get(obj, 'user.tags[1]'), 'user');
    });

    void it('returns undefined for missing paths', () => {
      assert.strictEqual(Path.get(obj, 'user.missing'), undefined);
      assert.strictEqual(Path.get(obj, 'missing.path'), undefined);
    });

    void it('returns undefined for proto-pollution paths', () => {
      assert.strictEqual(Path.get(obj, '__proto__'), undefined);
      assert.strictEqual(Path.get(obj, 'constructor'), undefined);
    });

    void it('returns entire object for empty path', () => {
      assert.strictEqual(Path.get(obj, ''), obj);
    });

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
  });
});
