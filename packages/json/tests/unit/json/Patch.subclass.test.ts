import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Patch } from '../../../src/json/Patch.js';

/**
 * Subclass extension test — `StrictPatch` extends `Patch`. The key assertion
 * is that static factory methods invoked on `StrictPatch` return `StrictPatch`
 * instances, not base `Patch` instances, because `make()` uses `new this(...)`.
 */
class StrictPatch extends Patch {
  /** Extra field to distinguish from base Patch */
  public readonly isStrict = true;
}

void describe('Patch subclass extension (protected static make)', () => {
  void it('StrictPatch.add returns a StrictPatch instance', () => {
    const p = StrictPatch.add('/foo', 'bar');

    assert.ok(p instanceof StrictPatch, 'factory should return StrictPatch');
    assert.ok(p instanceof Patch, 'StrictPatch is also a Patch');
    assert.strictEqual((p as StrictPatch).isStrict, true);
  });

  void it('StrictPatch.combine returns a StrictPatch instance', () => {
    const p = StrictPatch.combine(
      StrictPatch.add('/a', 1),
      StrictPatch.remove('/b')
    );

    assert.ok(p instanceof StrictPatch, 'combine result should be StrictPatch');
  });

  void it('StrictPatch.fromPlain returns a StrictPatch instance', () => {
    const plain = StrictPatch.add('/x', 42).toPlain();
    const p = StrictPatch.fromPlain(plain);

    assert.ok(p instanceof StrictPatch, 'fromPlain should return StrictPatch');
  });

  void it('base Patch factories still return Patch (not StrictPatch)', () => {
    const p = Patch.add('/foo', 'bar');

    assert.ok(p instanceof Patch);
    assert.ok(!(p instanceof StrictPatch), 'base factory must NOT return StrictPatch');
  });

  void it('StrictPatch.apply works normally', () => {
    const target: Record<string, unknown> = {};
    StrictPatch.add('/key', 'value').apply(target);

    assert.strictEqual(target['key'], 'value');
  });
});
