import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Patch } from '../../../src/json/Patch.js';

/**
 * Subclass extension test — `StrictPatch` extends `Patch`. The canonical
 * `create` route constructs the receiving subclass at runtime.
 */
class StrictPatch extends Patch {
  /** Extra field to distinguish from base Patch */
  public readonly isStrict = true;
}

void describe('Patch subclass extension', () => {
  void it('StrictPatch.create returns a StrictPatch instance', () => {
    const p = StrictPatch.create({ op: 'add', path: '/foo', value: 'bar' });

    assert.ok(p instanceof StrictPatch, 'factory should return StrictPatch');
    assert.ok(p instanceof Patch, 'StrictPatch is also a Patch');
    assert.strictEqual(p.isStrict, true);
  });

  void it('base Patch.create returns Patch (not StrictPatch)', () => {
    const p = Patch.create({ op: 'add', path: '/foo', value: 'bar' });

    assert.ok(p instanceof Patch);
    assert.ok(!(p instanceof StrictPatch), 'base factory must NOT return StrictPatch');
  });

  void it('StrictPatch.apply works normally', () => {
    const target: Record<string, unknown> = {};
    StrictPatch.create({ op: 'add', path: '/key', value: 'value' }).apply(target);

    assert.strictEqual(target['key'], 'value');
  });
});
