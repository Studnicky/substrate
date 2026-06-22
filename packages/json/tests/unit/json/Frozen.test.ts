import assert from 'node:assert';
import { describe, it } from 'node:test';

import { Frozen } from '../../../src/json/Frozen.js';

void describe('Frozen', () => {
  void describe('Frozen.deepFreeze', () => {
    void it('freezes a flat object', () => {
      const obj = { a: 1, b: 2 };
      const frozen = Frozen.deepFreeze(obj);

      assert.ok(Object.isFrozen(frozen));
    });

    void it('deeply freezes nested objects', () => {
      const obj = { a: 1, b: { c: 3 } };
      const frozen = Frozen.deepFreeze(obj);

      assert.ok(Object.isFrozen(frozen));
      assert.ok(Object.isFrozen(frozen.b));
    });

    void it('freezes arrays', () => {
      const arr = [1, 2, { x: 3 }];
      const frozen = Frozen.deepFreeze(arr);

      assert.ok(Object.isFrozen(frozen));
      assert.ok(Object.isFrozen(frozen[2]));
    });

    void it('returns the same reference', () => {
      const obj = { a: 1 };
      const frozen = Frozen.deepFreeze(obj);

      assert.strictEqual(frozen, obj);
    });

    void it('handles circular references without throwing', () => {
      const obj: Record<string, unknown> = { a: 1 };

      obj['self'] = obj;
      assert.doesNotThrow(() => Frozen.deepFreeze(obj));
    });

    void it('passes through primitives unchanged', () => {
      assert.strictEqual(Frozen.deepFreeze(42), 42);
      assert.strictEqual(Frozen.deepFreeze('hello'), 'hello');
      assert.strictEqual(Frozen.deepFreeze(null), null);
    });
  });
});
