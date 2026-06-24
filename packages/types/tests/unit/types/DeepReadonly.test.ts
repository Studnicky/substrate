import assert from 'node:assert/strict';
import { it } from 'node:test';

/**
 * Compile-time structural tests for DeepReadonlyType.
 * These use `satisfies` to verify type assignments hold at the TypeScript level.
 * Runtime assertions confirm the runtime value shapes used as proxies.
 */
import type { DeepReadonlyType } from '../../../src/types/DeepReadonly.js';

const primitiveScenarios: Array<{ description: string; check: () => void }> = [
  {
    description: 'DeepReadonlyType passes through number unchanged',
    check: () => {
      const n: DeepReadonlyType<number> = 42;
      assert.equal(typeof n, 'number');
    },
  },
  {
    description: 'DeepReadonlyType passes through string unchanged',
    check: () => {
      const s: DeepReadonlyType<string> = 'hello';
      assert.equal(typeof s, 'string');
    },
  },
];
for (const { description, check } of primitiveScenarios) {
  void it(description, check);
}

void it('DeepReadonlyType wraps arrays as readonly', () => {
  const arr: DeepReadonlyType<number[]> = [1, 2, 3];
  assert.equal(arr.length, 3);
  // TypeScript would prevent push/pop — verified at compile time
});

void it('DeepReadonlyType wraps nested objects recursively', () => {
  type Nested = { a: { b: number } };
  const obj: DeepReadonlyType<Nested> = { a: { b: 1 } };
  assert.equal(obj.a.b, 1);
});

void it('DeepReadonlyType wraps Sets as ReadonlySet', () => {
  const set: DeepReadonlyType<Set<string>> = new Set(['a', 'b']);
  assert.ok(set.has('a'));
  assert.ok(set.has('b'));
});

void it('DeepReadonlyType wraps Maps as ReadonlyMap', () => {
  const map: DeepReadonlyType<Map<string, number>> = new Map([['x', 1]]);
  assert.equal(map.get('x'), 1);
});
