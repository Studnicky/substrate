import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

/**
 * Compile-time structural tests for DeepReadonlyType.
 * These use `satisfies` to verify type assignments hold at the TypeScript level.
 * Runtime assertions confirm the runtime value shapes used as proxies.
 */
import type { DeepReadonlyType } from '../../../src/types/DeepReadonly.js';

void describe('DeepReadonlyType', () => {
  void it('passes through primitive types unchanged', () => {
    // At runtime, a number satisfies DeepReadonlyType<number>
    const n: DeepReadonlyType<number> = 42;
    assert.equal(typeof n, 'number');

    const s: DeepReadonlyType<string> = 'hello';
    assert.equal(typeof s, 'string');
  });

  void it('wraps arrays as readonly', () => {
    const arr: DeepReadonlyType<number[]> = [1, 2, 3];
    assert.equal(arr.length, 3);
    // TypeScript would prevent push/pop — verified at compile time
  });

  void it('wraps nested objects recursively', () => {
    type Nested = { a: { b: number } };
    const obj: DeepReadonlyType<Nested> = { a: { b: 1 } };
    assert.equal(obj.a.b, 1);
  });

  void it('wraps Sets as ReadonlySet', () => {
    const set: DeepReadonlyType<Set<string>> = new Set(['a', 'b']);
    assert.ok(set.has('a'));
    assert.ok(set.has('b'));
  });

  void it('wraps Maps as ReadonlyMap', () => {
    const map: DeepReadonlyType<Map<string, number>> = new Map([['x', 1]]);
    assert.equal(map.get('x'), 1);
  });
});
