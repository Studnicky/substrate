import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Clone } from '../../../src/json/Clone.js';

/**
 * Subclass extension test — `TaggedClone` overrides `cloneObject` to inject
 * a `__tag` field into every cloned object. Proves that deep recursion
 * propagates through the override (nested objects also get tagged).
 */
class TaggedClone extends Clone {
  protected static override cloneObject(value: Record<string, unknown>): Record<string, unknown> {
    const base = super.cloneObject(value);

    return { ...base, '__tag': 'cloned' };
  }
}

void describe('Clone subclass extension', () => {
  void it('cloneObject override is called for the root object', () => {
    const result = TaggedClone.deep({ a: 1 });

    assert.strictEqual((result as Record<string, unknown>)['__tag'], 'cloned');
    assert.strictEqual((result as Record<string, unknown>)['a'], 1);
  });

  void it('cloneObject override propagates through nested objects via recursion', () => {
    const result = TaggedClone.deep({ a: 1, nested: { b: 2 } }) as Record<string, unknown>;

    // Root gets tagged
    assert.strictEqual(result['__tag'], 'cloned');

    // Nested object also gets tagged because cloneValue calls this.cloneObject
    const nested = result['nested'] as Record<string, unknown>;

    assert.strictEqual(nested['__tag'], 'cloned');
    assert.strictEqual(nested['b'], 2);
  });

  void it('static Clone.deep is unaffected by the subclass override', () => {
    const result = Clone.deep({ a: 1, nested: { b: 2 } }) as Record<string, unknown>;

    assert.strictEqual(result['__tag'], undefined);
  });
});
