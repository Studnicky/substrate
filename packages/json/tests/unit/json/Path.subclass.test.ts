import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Path } from '../../../src/json/Path.js';

/**
 * Subclass extension test — `OpenPath` overrides `isSafeProperty` to always
 * return `true`, disabling the proto-pollution safety guard. This proves that
 * `get()` respects the override when traversing property names that the base
 * class would block.
 */
class OpenPath extends Path {
  /** Override: every property name is considered safe. */
  protected static override isSafeProperty(_name: string): boolean {
    return true;
  }
}

void describe('Path subclass extension', () => {
  void it('base Path.get blocks __proto__-style key', () => {
    const obj: Record<string, unknown> = {};

    // Simulate an object that has a custom key starting with double-underscore
    obj['__secret'] = 'hidden';

    const result = Path.get(obj, '__secret');

    assert.strictEqual(result, undefined, 'base Path should block double-underscore keys');
  });

  void it('OpenPath.get traverses the same key the base blocked', () => {
    const obj: Record<string, unknown> = {};

    obj['__secret'] = 'hidden';

    const result = OpenPath.get(obj, '__secret');

    assert.strictEqual(result, 'hidden', 'OpenPath should traverse the key');
  });

  void it('nested traversal also respects override', () => {
    const obj: Record<string, unknown> = {
      layer: { '__inner': 42 }
    };

    const baseResult = Path.get(obj, 'layer.__inner');

    assert.strictEqual(baseResult, undefined, 'base blocks __inner at nested level');

    const openResult = OpenPath.get(obj, 'layer.__inner');

    assert.strictEqual(openResult, 42, 'OpenPath traverses __inner at nested level');
  });
});
